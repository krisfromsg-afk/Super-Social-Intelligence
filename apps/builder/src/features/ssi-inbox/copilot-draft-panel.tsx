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
import { readSsiUiControl } from "./ui-ai-control"

/**
 * Temporary one-draft staging. Approved status deliberately NEVER dispatches.
 * Operators must still use the normal human composer for actual sends.
 */
export function SsiCopilotDraftPanel({
  conversation,
  workspaceId,
}: { conversation: ConversationResource; workspaceId: string }) {
  const latest = useChatStore((state) =>
    state.conversations.find((item) => item.id === conversation.id),
  )
  const control = readSsiUiControl((latest ?? conversation).additionalAttributes)
  if (control?.mode !== "copilot") return null
  return (
    <SsiCopilotDraftEditor
      key={`${conversation.id}:${control.version}`}
      conversationId={conversation.id}
      workspaceId={workspaceId}
      modeVersion={control.version}
    />
  )
}

function SsiCopilotDraftEditor({
  conversationId,
  workspaceId,
  modeVersion,
}: { conversationId: string; workspaceId: string; modeVersion: number }) {
  const [draft, setDraft] = useState<SsiCopilotDraft | null>(null)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { execute: load, isExecuting: isLoading } = useAction(
    getSsiCopilotDraftAction.bind(null, workspaceId),
    {
      onSuccess: ({ data }) => {
        if (data !== undefined) {
          setDraft(data)
          setText(data?.text ?? "")
          setError(null)
        }
      },
      onError: ({ error: e }) => setError(e.serverError ?? "Cannot load Copilot draft"),
    },
  )
  const { execute: save, isExecuting: isSaving } = useAction(
    saveSsiCopilotDraftAction.bind(null, workspaceId),
    {
      onSuccess: ({ data }) => {
        if (data) {
          setDraft(data)
          setError(null)
          toast.success("Draft staged for human review. Nothing was sent.")
        }
      },
      onError: ({ error: e }) => setError(e.serverError ?? "Draft changed. Reload and retry."),
    },
  )
  const { execute: review, isExecuting: isReviewing } = useAction(
    reviewSsiCopilotDraftAction.bind(null, workspaceId),
    {
      onSuccess: ({ data }) => {
        if (data) {
          setDraft((previous) =>
            previous ? { ...previous, version: data.version, status: data.status } : null,
          )
          setError(null)
          toast.success(data.status === "approved_not_sent"
            ? "Approved for staging only. No message was sent."
            : "Draft rejected. No message was sent.")
        }
      },
      onError: ({ error: e }) => setError(e.serverError ?? "Review changed. Reload and retry."),
    },
  )
  useEffect(() => {
    load({ conversationId })
  }, [conversationId, load])

  const busy = isLoading || isSaving || isReviewing
  return (
    <section
      aria-label="SSI Copilot staging"
      className="mx-3 rounded-xl border border-border bg-card p-3 text-sm"
      data-testid="ssi-copilot-staging"
    >
      <h2 className="font-semibold">Copilot · Review staging</h2>
      <p className="mt-1 text-muted-foreground text-xs">
        Operator-authored text only. AI origin is unverified. Approve records a
        decision but never sends or queues a message.
      </p>
      <label htmlFor="ssi-copilot-draft-text" className="mt-3 block text-xs font-medium">
        Suggested reply (not sent)
      </label>
      <textarea
        id="ssi-copilot-draft-text"
        className="mt-1 min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm"
        value={text}
        maxLength={8000}
        onChange={(event) => setText(event.target.value)}
        disabled={busy}
      />
      <p className="mt-1 text-muted-foreground text-xs">
        {draft ? `Draft v${draft.version} · ${draft.status.replaceAll("_", " ")}` : "No staged draft"}
      </p>
      {error && <p role="alert" className="mt-2 text-destructive text-xs">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          type="button"
          disabled={busy || !text.trim() || text.length > 8000}
          onClick={() => save({
            conversationId, expectedModeVersion: modeVersion,
            expectedDraftVersion: draft?.version ?? 0, text,
          })}
        >Save for review</Button>
        {draft?.status === "pending" && (
          <>
            <Button size="sm" variant="outline" type="button" disabled={busy}
              onClick={() => review({
                conversationId, expectedModeVersion: modeVersion,
                expectedDraftVersion: draft.version, decision: "approve",
              })}>
              Approve (no send)
            </Button>
            <Button size="sm" variant="outline" type="button" disabled={busy}
              onClick={() => review({
                conversationId, expectedModeVersion: modeVersion,
                expectedDraftVersion: draft.version, decision: "reject",
              })}>
              Reject
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" type="button" disabled={busy}
          onClick={() => load({ conversationId })}>
          Reload
        </Button>
      </div>
    </section>
  )
}
