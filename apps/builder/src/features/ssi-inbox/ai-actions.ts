"use server"

import { generateSsiCopilotDraft } from "@chatbotx.io/ai/server"
import { ssiCopilotDraftService } from "@chatbotx.io/business"
import { ssiCopilotGenerationService, ssiPersonaService } from "@chatbotx.io/business/ssi-ai"
import { zodBigintAsString } from "@chatbotx.io/utils"
import { z } from "zod"
import { workspaceActionClient } from "@/lib/safe-action"
import { assertSsiCopilotDraftAccess } from "@/features/conversations/ssi-copilot-draft-permissions"

const id = zodBigintAsString()
const request = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("agents") }),
  z.object({ operation: z.literal("generate"), conversationId: id, agentId: id,
    requestKey: z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/),
    expectedModeVersion: z.number().int().min(1).max(2147483646), expectedDraftVersion: z.number().int().min(0).max(2147483646) }),
  z.object({ operation: z.literal("history"), conversationId: id }),
  z.object({ operation: z.literal("trace"), conversationId: id, runId: id }),
])

/** Human-session-only. API tokens and support sessions cannot impersonate a reviewer. */
export const ssiInboxAiAction = workspaceActionClient.bindArgsSchemas([id]).inputSchema(request).action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput, ctx }) => {
  assertSsiCopilotDraftAccess(ctx.workspaceMemberPermissions, ctx.isSupportSession)
  switch (parsedInput.operation) {
    case "agents": return { operation: "agents" as const, agents: await ssiPersonaService.options({ workspaceId }) }
    case "generate": return { operation: "generate" as const, ...await generateSsiCopilotDraft({ ...parsedInput, workspaceId, actorId: ctx.user.id }) }
    case "history": return { operation: "history" as const, history: await ssiCopilotDraftService.history({ ...parsedInput, workspaceId }) }
    case "trace": return { operation: "trace" as const, trace: await ssiCopilotGenerationService.trace({ ...parsedInput, workspaceId }) }
  }
})
