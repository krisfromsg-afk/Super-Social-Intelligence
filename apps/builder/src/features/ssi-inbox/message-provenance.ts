import type { MessageResourceWithRelations } from "@/features/messages/schema/resource"

export type SsiOutboundSender = {
  label: string
  accessibleName: string
  kind: "automated" | "human" | "api" | "system"
}

/**
 * Sender provenance is derived from persisted message fields, never guessed
 * from the content of a model-generated answer.
 *
 * In upstream ChatbotX the "bot" sender includes both flow replies and
 * AI Agent replies. Do NOT present those as proven LLM output until a
 * dedicated, durable responseType trace is linked to the outbound message.
 */
export type SsiFlowReference = {
  flowId: string
  flowVersionId?: string
  stepId?: string
}

/**
 * A stored flow reference establishes association only, NOT executed-flow
 * verification or whether an LLM generated the outbound text. Never infer
 * a model, deterministic origin, tools or RAG citations from this field.
 */
export function getSsiOutboundFlowReference(
  message: Pick<MessageResourceWithRelations, "messageType" | "senderType" | "contentAttributes">,
): SsiFlowReference | null {
  if (message.messageType !== "outgoing" || message.senderType !== "bot") {
    return null
  }
  const attributes = message.contentAttributes
  if (!attributes || typeof attributes !== "object") {
    return null
  }
  const flowId = attributes.flowId
  if (typeof flowId !== "string" || !flowId.trim()) {
    return null
  }
  const flowVersionId = attributes.flowVersionId
  const stepId = attributes.stepId
  return {
    flowId: flowId.trim(),
    ...(typeof flowVersionId === "string" && flowVersionId.trim()
      ? { flowVersionId: flowVersionId.trim() }
      : {}),
    ...(typeof stepId === "string" && stepId.trim()
      ? { stepId: stepId.trim() }
      : {}),
  }
}

export function getSsiOutboundAuthor(
  message: Pick<MessageResourceWithRelations, "messageType" | "senderType">,
): SsiOutboundSender | null {
  if (message.messageType !== "outgoing") {
    return null
  }
  switch (message.senderType) {
    case "bot":
      return { label: "Bot", accessibleName: "automation bot", kind: "automated" }
    case "user":
      return { label: "Human", accessibleName: "human team member", kind: "human" }
    case "api":
      return { label: "API", accessibleName: "API integration", kind: "api" }
    case "system":
      return { label: "System", accessibleName: "system process", kind: "system" }
    default:
      return null
  }
}
