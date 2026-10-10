import { describe, expect, it } from "vitest"
import { getSsiOutboundAuthor, getSsiOutboundFlowReference } from "../message-provenance"

describe("SSI inbox sender provenance", () => {
  it("labels automated senders as bot, without claiming all are LLM output", () => {
    expect(
      getSsiOutboundAuthor({ messageType: "outgoing", senderType: "bot" }),
    ).toMatchObject({ kind: "automated", label: "Bot" })
  })
  it("shows a separate human team member label", () => {
    expect(
      getSsiOutboundAuthor({ messageType: "outgoing", senderType: "user" }),
    ).toMatchObject({ kind: "human", label: "Human" })
  })
  it("distinguishes external API and system senders", () => {
    expect(
      getSsiOutboundAuthor({ messageType: "outgoing", senderType: "api" })?.kind,
    ).toBe("api")
    expect(
      getSsiOutboundAuthor({ messageType: "outgoing", senderType: "system" })?.kind,
    ).toBe("system")
  })
  it("never adds an outbound badge to incoming or activity messages", () => {
    expect(
      getSsiOutboundAuthor({ messageType: "incoming", senderType: "contact" }),
    ).toBeNull()
    expect(
      getSsiOutboundAuthor({ messageType: "activity", senderType: "bot" }),
    ).toBeNull()
  })
  it("does not guess a sender for impossible or unknown combinations", () => {
    expect(
      getSsiOutboundAuthor({ messageType: "outgoing", senderType: "contact" }),
    ).toBeNull()
  })
})

describe("SSI stored flow references (not verified AI provenance)", () => {
  it("reads persisted references without inferring LLM authorship", () => {
    expect(
      getSsiOutboundFlowReference({
        messageType: "outgoing",
        senderType: "bot",
        contentAttributes: { flowId: " flow-123 ", flowVersionId: "version-7", stepId: "step-9" },
      }),
    ).toEqual({ flowId: "flow-123", flowVersionId: "version-7", stepId: "step-9" })
  })

  it("rejects absent, blank or non-string flow IDs", () => {
    for (const contentAttributes of [null, [], { flowId: "  " }, { flowId: 123 }]) {
      expect(
        getSsiOutboundFlowReference({ messageType: "outgoing", senderType: "bot", contentAttributes }),
      ).toBeNull()
    }
  })

  it("never calls human, API or incoming messages flow-linked bot replies", () => {
    for (const [messageType, senderType] of [
      ["outgoing", "user"], ["outgoing", "api"], ["incoming", "bot"],
    ] as const) {
      expect(
        getSsiOutboundFlowReference({
          messageType,
          senderType,
          contentAttributes: { flowId: "flow-123" },
        }),
      ).toBeNull()
    }
  })

  it("ignores malformed optional references", () => {
    expect(
      getSsiOutboundFlowReference({
        messageType: "outgoing",
        senderType: "bot",
        contentAttributes: { flowId: "flow-123", flowVersionId: 8, stepId: "" },
      }),
    ).toEqual({ flowId: "flow-123" })
  })
})
