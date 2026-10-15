import { afterAll, afterEach, describe, expect, it } from "vitest"
import { db, eq, sql } from "@chatbotx.io/database/client"
import { contactModel, conversationModel, userModel, workspaceModel } from "@chatbotx.io/database/schema"
import { mergeChannelConversationId } from "../channel-conversation-id"

const enabled = process.env.SSI_AI_DATABASE_TEST === "true"
if (enabled) {
  const url = new URL(process.env.DATABASE_URL ?? "")
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/ssi_ci") throw new Error("Disposable local ssi_ci database required")
}
const owners: string[] = []
const workspaces: string[] = []
async function fixture() {
  const [owner] = await db.insert(userModel).values({ email: `ssi-channel-${crypto.randomUUID()}@example.test` }).returning()
  owners.push(owner.id)
  const [workspace] = await db.insert(workspaceModel).values({ name: "SSI channel fixture", ownerId: owner.id }).returning()
  workspaces.push(workspace.id)
  const [contact] = await db.insert(contactModel).values({ workspaceId: workspace.id }).returning()
  const [conversation] = await db.insert(conversationModel).values({ workspaceId: workspace.id, contactId: contact.id, botEnabled: false,
    additionalAttributes: { channelConversationId: "old", ssiAiControl: { mode: "copilot", version: 1 }, keep: "preserved" } }).returning()
  return { workspaceId: workspace.id, conversationId: conversation.id }
}
async function read(id: string) {
  return db.query.conversationModel.findFirst({ where: { id } })
}

describe.skipIf(!enabled)("Atomic channel metadata merge on PostgreSQL", () => {
  afterEach(async () => {
    for (const id of workspaces.splice(0)) await db.delete(workspaceModel).where(eq(workspaceModel.id, id))
    for (const id of owners.splice(0)) await db.delete(userModel).where(eq(userModel.id, id))
  })
  afterAll(async () => { await db.$client.end() })
  it("preserves a takeover and newer draft instead of spreading an old conversation snapshot", async () => {
    const input = await fixture()
    const old = await read(input.conversationId)
    const current = { ...old!.additionalAttributes, ssiAiControl: { mode: "human_only", version: 2 }, ssiCopilotDraft: { version: 9, text: "new draft" } }
    await db.update(conversationModel).set({ additionalAttributes: current }).where(eq(conversationModel.id, input.conversationId))
    const [updated] = await mergeChannelConversationId({ ...input, channelConversationId: "rotated" })
    expect(updated.additionalAttributes).toEqual({ ...current, channelConversationId: "rotated" })
    expect(old!.additionalAttributes?.ssiAiControl).toEqual({ mode: "copilot", version: 1 })
  })
  it("preserves both changes under concurrent handover and provider metadata updates", async () => {
    const input = await fixture()
    for (let version = 2; version <= 5; version++) {
      const control = { mode: "human_only", version }
      await Promise.all([
        mergeChannelConversationId({ ...input, channelConversationId: `rotated-${version}` }),
        db.update(conversationModel).set({ botEnabled: false,
          additionalAttributes: sql`jsonb_set(${conversationModel.additionalAttributes}, '{ssiAiControl}', ${JSON.stringify(control)}::jsonb, true)`
        }).where(eq(conversationModel.id, input.conversationId)),
      ])
      expect((await read(input.conversationId))?.additionalAttributes).toMatchObject({ channelConversationId: `rotated-${version}`, ssiAiControl: control, keep: "preserved" })
    }
  })
  it("cannot update a conversation through another workspace", async () => {
    const a = await fixture(), b = await fixture()
    expect(await mergeChannelConversationId({ workspaceId: b.workspaceId, conversationId: a.conversationId, channelConversationId: "forbidden" })).toEqual([])
    expect((await read(a.conversationId))?.additionalAttributes?.channelConversationId).toBe("old")
  })
  it("initializes null attributes without treating opaque channel IDs as SQL", async () => {
    const input = await fixture()
    await db.update(conversationModel).set({ additionalAttributes: null }).where(eq(conversationModel.id, input.conversationId))
    const opaque = "provider-'quoted'-id\nwith-backslash\\"
    const [updated] = await mergeChannelConversationId({ ...input, channelConversationId: opaque })
    expect(updated.additionalAttributes).toEqual({ channelConversationId: opaque })
  })
  it("rejects malformed stored attributes instead of discarding them", async () => {
    const input = await fixture()
    await db.update(conversationModel).set({ additionalAttributes: sql`'[]'::jsonb` }).where(eq(conversationModel.id, input.conversationId))
    await expect(mergeChannelConversationId({ ...input, channelConversationId: "new" })).rejects.toThrow()
    expect((await read(input.conversationId))?.additionalAttributes).toEqual([])
  })
  it("rejects empty and oversized channel IDs without mutation", async () => {
    const input = await fixture()
    for (const channelConversationId of ["", "   ", "a".repeat(2049)]) {
      await expect(mergeChannelConversationId({ ...input, channelConversationId })).rejects.toThrow("Invalid channel")
    }
    expect((await read(input.conversationId))?.additionalAttributes?.channelConversationId).toBe("old")
  })
})
