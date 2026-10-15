import type { SsiCopilotDraft } from "@chatbotx.io/business"
import { act, type ButtonHTMLAttributes } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ConversationResource } from "@/features/conversations/schema/resource"

type ActionName = "load" | "save" | "review" | "ai"
type ActionCallbacks = {
  onSuccess: (result: { data: unknown }) => void
  onError: (result: { error: { serverError: string } }) => void
}
const mocks = vi.hoisted(() => ({
  execute: { load: vi.fn(), save: vi.fn(), review: vi.fn(), ai: vi.fn() },
  busy: { load: false, save: false, review: false, ai: false },
  callbacks: {} as Record<ActionName, ActionCallbacks>,
  latest: undefined as ConversationResource | undefined,
  toast: vi.fn(),
}))
vi.mock("next-safe-action/hooks", () => ({
  useAction: (action: ActionName, callbacks: ActionCallbacks) => {
    mocks.callbacks[action] = callbacks
    return { execute: mocks.execute[action], isExecuting: mocks.busy[action] }
  },
}))
vi.mock("@/features/conversations/actions/get-ssi-copilot-draft.action", () => ({ getSsiCopilotDraftAction: { bind: () => "load" } }))
vi.mock("@/features/conversations/actions/save-ssi-copilot-draft.action", () => ({ saveSsiCopilotDraftAction: { bind: () => "save" } }))
vi.mock("@/features/conversations/actions/review-ssi-copilot-draft.action", () => ({ reviewSsiCopilotDraftAction: { bind: () => "review" } }))
vi.mock("@/features/ssi-inbox/ai-actions", () => ({ ssiInboxAiAction: { bind: () => "ai" } }))
vi.mock("@/features/chat/store/chat-store-provider", () => ({ useChatStore: () => mocks.latest }))
vi.mock("sonner", () => ({ toast: { success: mocks.toast } }))
vi.mock("@chatbotx.io/ui/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type }: ButtonHTMLAttributes<HTMLButtonElement>) => <button type={type} onClick={onClick} disabled={disabled}>{children}</button>,
}))
const { SsiCopilotDraftPanel } = await import("@/features/ssi-inbox/copilot-draft-panel")
const conversation: ConversationResource = {
  id: "c1", workspaceId: "w1", contactId: "contact1", botEnabled: false, botResumeAt: null, archivedAt: null,
  additionalAttributes: { ssiAiControl: { mode: "copilot", version: 4 } },
  contactLastReadAt: null, agentLastReadAt: null, aiContextLastMessageId: null, lastActivityAt: null,
  followed: false, assignedUserId: null, assignedInboxTeamId: null, sourceId: null,
  lastStep: null, currentStep: null, adminRepliedAt: null, contactRepliedAt: null,
  createdAt: new Date("2026-10-15T00:00:00.000Z"), updatedAt: new Date("2026-10-15T00:00:00.000Z"),
}
const pending: SsiCopilotDraft = {
  version: 2, modeVersion: 4, origin: "operator", status: "pending",
  text: "Saved reply", updatedBy: "u1", updatedAt: "2026-10-15T00:00:00.000Z",
}

describe("SSI Copilot staging editor (never dispatches)", () => {
  let container: HTMLDivElement
  let root: Root
  function render(current = conversation, workspaceId = "w1") {
    act(() => root.render(<SsiCopilotDraftPanel conversation={current} workspaceId={workspaceId} />))
  }
  function button(label: string) {
    const result = Array.from(container.querySelectorAll("button")).find((element) => element.textContent?.trim() === label)
    if (!result) throw new Error(`Missing button: ${label}`)
    return result
  }
  function textarea() {
    const result = container.querySelector("textarea")
    if (!result) throw new Error("Missing draft textarea")
    return result
  }
  function success(action: ActionName, data: unknown) { act(() => mocks.callbacks[action].onSuccess({ data })) }
  function edit(text: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
    if (!setter) throw new Error("Missing native textarea setter")
    act(() => { setter.call(textarea(), text); textarea().dispatchEvent(new Event("input", { bubbles: true })) })
  }
  function click(label: string) { act(() => button(label).click()) }
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.latest = undefined
    mocks.busy.load = false; mocks.busy.save = false; mocks.busy.review = false; mocks.busy.ai = false
    mocks.callbacks = {} as Record<ActionName, ActionCallbacks>
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement("div"); document.body.append(container)
    root = createRoot(container); render()
  })
  afterEach(() => { act(() => root.unmount()); container.remove() })

  it("requires an authorized read before editing or saving a version-zero draft", () => {
    expect(mocks.execute.load).toHaveBeenCalledWith({ conversationId: "c1" })
    expect(textarea().disabled).toBe(true); expect(button("Save for review").disabled).toBe(true)
    success("load", null)
    expect(textarea().disabled).toBe(false)
    edit("New reply"); click("Save for review")
    expect(mocks.execute.save).toHaveBeenCalledWith({ conversationId: "c1", expectedModeVersion: 4, expectedDraftVersion: 0, text: "New reply" })
  })
  it("blocks approval and rejection while visible text has unsaved changes", () => {
    success("load", pending)
    expect(button("Approve (no send)").disabled).toBe(false)
    edit("Changed reply")
    expect(button("Approve (no send)").disabled).toBe(true); expect(button("Reject").disabled).toBe(true)
    click("Approve (no send)"); click("Reject")
    expect(mocks.execute.review).not.toHaveBeenCalled(); expect(button("Save for review").disabled).toBe(false)
    edit(pending.text); expect(button("Approve (no send)").disabled).toBe(false)
  })
  it("uses canonical saved text and the new revision when approving after an edit", () => {
    success("load", pending); edit("  Revised reply  "); click("Save for review")
    expect(mocks.execute.save).toHaveBeenCalledWith({ conversationId: "c1", expectedModeVersion: 4, expectedDraftVersion: 2, text: "  Revised reply  " })
    success("save", { ...pending, version: 3, text: "Revised reply" })
    expect(textarea().value).toBe("Revised reply"); expect(button("Approve (no send)").disabled).toBe(false)
    click("Approve (no send)")
    expect(mocks.execute.review).toHaveBeenCalledWith({ conversationId: "c1", expectedModeVersion: 4, expectedDraftVersion: 3, decision: "approve" })
    success("review", { version: 4, status: "approved_not_sent" })
    expect(container.textContent).toContain("approved not sent"); expect(container.textContent).not.toContain("Approve (no send)")
  })
  it("records rejection using the current persisted version", () => {
    success("load", pending); click("Reject")
    expect(mocks.execute.review).toHaveBeenCalledWith({ conversationId: "c1", expectedModeVersion: 4, expectedDraftVersion: 2, decision: "reject" })
    success("review", { version: 3, status: "rejected" })
    expect(container.textContent).toContain("rejected"); expect(container.textContent).not.toContain("Approve (no send)")
  })
  it.each(["load", "save", "review"] as const)("requires reload after a %s failure", (action) => {
    success("load", pending)
    act(() => mocks.callbacks[action].onError({ error: { serverError: "Refresh required" } }))
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Refresh required")
    expect(button("Save for review").disabled).toBe(true); expect(button("Approve (no send)").disabled).toBe(true); expect(textarea().disabled).toBe(true)
    click("Approve (no send)"); expect(mocks.execute.review).not.toHaveBeenCalled()
    expect(button("Reload").disabled).toBe(false); click("Reload")
    success("load", { ...pending, version: 5 })
    expect(button("Approve (no send)").disabled).toBe(false); expect(container.querySelector('[role="alert"]')).toBeNull()
  })
  it("lets a stale-mode draft be revised but never reviewed", () => {
    success("load", { ...pending, modeVersion: 3 })
    expect(container.textContent).not.toContain("Approve (no send)"); click("Save for review")
    expect(mocks.execute.save).toHaveBeenCalledWith({ conversationId: "c1", expectedModeVersion: 4, expectedDraftVersion: 2, text: pending.text })
  })
  it.each(["load", "save", "review"] as const)("disables controls during %s", (action) => {
    success("load", pending); mocks.busy[action] = true; render()
    expect(textarea().disabled).toBe(true); expect(button("Save for review").disabled).toBe(true)
    expect(button("Approve (no send)").disabled).toBe(true); expect(button("Reload").disabled).toBe(true)
  })
  it("resets the editor when the realtime mode version changes", () => {
    success("load", pending)
    mocks.latest = { ...conversation, additionalAttributes: { ssiAiControl: { mode: "copilot", version: 5 } } }; render()
    expect(textarea().value).toBe(""); expect(textarea().disabled).toBe(true)
    expect(container.textContent).not.toContain("Approve (no send)"); expect(mocks.execute.load).toHaveBeenCalledTimes(2)
  })
  it("does not carry private text across conversation or workspace changes", () => {
    success("load", pending); render({ ...conversation, id: "c2" })
    expect(textarea().value).toBe(""); expect(mocks.execute.load).toHaveBeenLastCalledWith({ conversationId: "c2" })
    success("load", pending); render({ ...conversation, id: "c2", workspaceId: "w2" }, "w2")
    expect(textarea().value).toBe(""); expect(textarea().disabled).toBe(true)
  })
  it.each(["human_only", "autopilot"])("hides staging in %s", (mode) => {
    success("load", pending); mocks.latest = { ...conversation, additionalAttributes: { ssiAiControl: { mode, version: 5 } } }; render()
    expect(container.querySelector("textarea")).toBeNull()
  })
  it("generates only after authorized loading and preserves the server draft version", () => {
    success("ai", { operation: "agents", agents: [{ id: "321", name: "Test agent", isDefault: true }] })
    expect(button("Generate AI draft").disabled).toBe(true)
    success("load", null); expect(button("Generate AI draft").disabled).toBe(false)
    edit("Unsaved operator reply"); expect(button("Generate AI draft").disabled).toBe(true)
    edit(""); click("Generate AI draft")
    expect(mocks.execute.ai).toHaveBeenLastCalledWith(expect.objectContaining({ operation: "generate", agentId: "321", conversationId: "c1", expectedDraftVersion: 0, expectedModeVersion: 4 }))
    success("ai", { operation: "generate", draft: { ...pending, origin: "ai", runId: "555", version: 3 }, trace: { id: "555", model: "fixture" } })
    expect(textarea().value).toBe(pending.text)
    click("Approve (no send)"); expect(mocks.execute.review).toHaveBeenLastCalledWith(expect.objectContaining({ expectedDraftVersion: 3 }))
    click("Execution trace"); expect(mocks.execute.ai).toHaveBeenLastCalledWith({ operation: "trace", conversationId: "c1", runId: "555" })
  })
  it("disables writes while AI generation is executing", () => {
    success("load", pending); mocks.busy.ai = true; render()
    expect(textarea().disabled).toBe(true); expect(button("Save for review").disabled).toBe(true); expect(button("Approve (no send)").disabled).toBe(true)
  })
  it("fails closed on inconsistent bot-enabled Copilot state", () => {
    mocks.latest = { ...conversation, botEnabled: true }; render()
    expect(container.querySelector("textarea")).toBeNull()
  })
})
