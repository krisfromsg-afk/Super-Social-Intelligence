import { describe, expect, it } from "vitest"
import { getSsiOutboundAuthor } from "../message-provenance"

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
