"use client"

import type { SsiCopilotDraft } from "@chatbotx.io/business"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getSsiCopilotDraftAction } from "@/features/conversations/actions/get-ssi-copilot-draft.action"
import { reviewSsiCopilotDraftAction } from "@/features/conversations/actions/review-ssi-copilot-draft.action"
import { saveSsiCopilotDraftAction } from "@/features/conversations/actions/save-ssi-copilot-draft.action"
import type { ConversationResource } from "@/features/conversations/schema/resource"
import { useChatStore } from "@/features/chat/store/chat-store-provider"
import { SsiCopilotAiControls } from "./copilot-ai-controls"
import { readSsiUiControl } from "./ui-ai-control"

/** Versioned draft review. Approved status deliberately NEVER dispatches. */
export function SsiCopilotDraftPanel({ conversation, workspaceId }: { conversation: ConversationResource; workspaceId: string }) {
  const latest = useChatStore((state) => state.conversations.find((item) => item.id === conversation.id))
  const current = latest ?? conversation
  const control = readSsiUiControl(current.additionalAttributes)
  if (current.botEnabled || control?.mode !== "copilot") return null
  return <SsiCopilotDraftEditor key={`${workspaceId}:${conversation.id}:${control.version}`} conversationId={conversation.id} workspaceId={workspaceId} modeVersion={control.version} />
}

function SsiCopilotDraftEditor({ conversationId, workspaceId, modeVersion }: { conversationId: string; workspaceId: string; modeVersion: number }) {
  const [draft, setDraft] = useState<SsiCopilotDraft | null>(null)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const { execute: load, isExecuting: isLoading } = useAction(getSsiCopilotDraftAction.bind(null, workspaceId), {
    onSuccess: ({ data }) => {
      if (data !== undefined) { setDraft(data); setText(data?.text ?? ""); setError(null); setLoaded(true) }
    },
    onError: ({ error: e }) => { setLoaded(false); setError(e.serverError ?? "Cannot load Copilot draft") },
  })
  const { execute: save, isExecuting: isSaving } = useAction(saveSsiCopilotDraftAction.bind(null, workspaceId), {
    onSuccess: ({ data }) => {
      if (data) { setDraft(data); setText(data.text); setError(null); toast.success("Draft staged for human review. Nothing was sent.") }
    },
    onError: ({ error: e }) => { setLoaded(false); setError(e.serverError ?? "Draft changed. Reload and retry.") },
  })
  const { execute: review, isExecuting: isReviewing } = useAction(reviewSsiCopilotDraftAction.bind(null, workspaceId), {
    onSuccess: ({ data }) => {
      if (data) {
        setDraft((previous) => previous ? { ...previous, version: data.version, status: data.status } : null)
        setError(null)
        load({ conversationId })
        toast.success(data.status === "approved_not_sent" ? "Approved for staging only. No message was sent." : "Draft rejected. No message was sent.")
      }
    },
    onError: ({ error: e }) => { setLoaded(false); setError(e.serverError ?? "Review changed. Reload and retry.") },
  })
  useEffect(() => { load({ conversationId }) }, [conversationId, load])
  const busy = isLoading || isSaving || isReviewing || aiBusy
  const stale = draft !== null && draft.modeVersion !== modeVersion
  const dirty = text !== (draft?.text ?? "")
  return <section aria-label="SSI Copilot staging" className="mx-3 rounded-xl border border-border bg-card p-3 text-sm" data-testid="ssi-copilot-staging">
    <h2 className="font-semibold">Copilot · Review staging</h2>
    <p className="mt-1 text-muted-foreground text-xs">Create an AI draft or write your own. Each saved revision and review is recorded. Approve never sends or queues a customer message.</p>
    <SsiCopilotAiControls workspaceId={workspaceId} conversationId={conversationId} modeVersion={modeVersion} draft={draft}
      disabled={!loaded || isLoading || isSaving || isReviewing || dirty} onBusy={setAiBusy}
      onGenerated={(next) => { setDraft(next); setText(next.text); setError(null) }} />
    <label htmlFor="ssi-copilot-draft-text" className="mt-3 block text-xs font-medium">Suggested reply (not sent)</label>
    <textarea id="ssi-copilot-draft-text" className="mt-1 min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm" value={text} maxLength={8000} onChange={(event) => setText(event.target.value)} disabled={busy || !loaded} />
    <p className="mt-1 text-muted-foreground text-xs">{draft ? `Draft v${draft.version} · ${draft.status.replaceAll("_", " ")}` : "No staged draft"}</p>
    {stale && <p className="mt-2 text-amber-700 dark:text-amber-300 text-xs">This draft belongs to an earlier Copilot mode. It cannot be approved. Save a new revision before reviewing.</p>}
    {error && <p role="alert" className="mt-2 text-destructive text-xs">{error}</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" type="button" disabled={busy || !loaded || !text.trim() || text.length > 8000} onClick={() => save({ conversationId, expectedModeVersion: modeVersion, expectedDraftVersion: draft?.version ?? 0, text })}>Save for review</Button>
      {draft?.status === "pending" && !stale && <>
        <Button size="sm" variant="outline" type="button" disabled={busy || !loaded || dirty} onClick={() => review({ conversationId, expectedModeVersion: modeVersion, expectedDraftVersion: draft.version, decision: "approve" })}>Approve (no send)</Button>
        <Button size="sm" variant="outline" type="button" disabled={busy || !loaded || dirty} onClick={() => review({ conversationId, expectedModeVersion: modeVersion, expectedDraftVersion: draft.version, decision: "reject" })}>Reject</Button>
      </>}
      <Button size="sm" variant="ghost" type="button" disabled={busy} onClick={() => load({ conversationId })}>Reload</Button>
    </div>
  </section>
}
