"use client"

import type { SsiCopilotDraft } from "@chatbotx.io/business"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"
import { ssiInboxAiAction } from "./ai-actions"

export function SsiCopilotAiControls({ workspaceId, conversationId, modeVersion, draft, disabled, onGenerated, onBusy }: {
  workspaceId: string; conversationId: string; modeVersion: number; draft: SsiCopilotDraft | null; disabled: boolean
  onGenerated: (draft: SsiCopilotDraft) => void; onBusy: (busy: boolean) => void
}) {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; isDefault: boolean }>>([])
  const [agentId, setAgentId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<string | null>(null)
  const { execute, isExecuting } = useAction(ssiInboxAiAction.bind(null, workspaceId), {
    onSuccess: ({ data }) => {
      setError(null)
      if (data?.operation === "agents") {
        setAgents(data.agents)
        setAgentId((previous) => previous || data.agents.find((agent) => agent.isDefault)?.id || data.agents[0]?.id || "")
      } else if (data?.operation === "generate") {
        onGenerated(data.draft)
        setEvidence(JSON.stringify(data.trace, null, 2))
      } else if (data?.operation === "trace") setEvidence(JSON.stringify(data.trace, null, 2))
      else if (data?.operation === "history") setEvidence(JSON.stringify(data.history, null, 2))
    },
    onError: ({ error }) => setError(error.serverError ?? "SSI AI operation failed. Reload before retrying."),
  })
  useEffect(() => { execute({ operation: "agents" }) }, [execute])
  useEffect(() => { onBusy(isExecuting) }, [isExecuting, onBusy])
  const runId = draft?.runId ?? draft?.derivedFromRunId
  return <div className="mt-3 rounded-md border p-2">
    <label className="block text-xs font-medium" htmlFor="ssi-copilot-agent">AI Agent for this draft</label>
    <select id="ssi-copilot-agent" className="my-2 w-full rounded border bg-background p-2" value={agentId} disabled={isExecuting || disabled} onChange={(event) => setAgentId(event.target.value)}>
      <option value="">Select an AI Agent</option>
      {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
    </select>
    <p className="mb-2 text-xs text-muted-foreground">Generation sends recent conversation text and selected published knowledge to the workspace's configured model provider. It cannot run tools or send a customer message. Review every draft.</p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" type="button" disabled={disabled || isExecuting || !agentId} onClick={() => execute({ operation: "generate", conversationId, agentId, expectedModeVersion: modeVersion, expectedDraftVersion: draft?.version ?? 0, requestKey: crypto.randomUUID() })}>Generate AI draft</Button>
      <Button size="sm" type="button" variant="outline" disabled={isExecuting || !runId} onClick={() => runId && execute({ operation: "trace", conversationId, runId })}>Execution trace</Button>
      <Button size="sm" type="button" variant="outline" disabled={isExecuting} onClick={() => execute({ operation: "history", conversationId })}>Review history</Button>
    </div>
    {draft && <p className="mt-2 text-xs">{draft.origin === "ai" ? "AI-generated draft" : draft.derivedFromRunId ? "Operator-edited AI draft" : "Operator-authored draft"}. Approval is not a delivery receipt.</p>}
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    {evidence && <details className="mt-2"><summary>Private execution / review evidence</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{evidence}</pre></details>}
  </div>
}
