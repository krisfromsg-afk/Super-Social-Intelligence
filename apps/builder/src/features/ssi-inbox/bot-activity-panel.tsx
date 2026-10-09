"use client"

import { BotIcon, UserRoundIcon } from "lucide-react"
import { useMemo } from "react"
import type { ConversationResource } from "@/features/conversations/schema/resource"
import { useThreadControl } from "@/features/conversations/hooks/use-thread-control"
import { isConversationActive } from "@/features/conversations/utils/bot-state"
import { useChatStore } from "@/features/chat/store/chat-store-provider"

/**
 * Inspects REAL persisted, currently loaded outgoing messages. This is not
 * an LLM trace viewer: senderType=bot also covers deterministic flow output.
 * Model/tool/retrieval-source traces need server-side persistence and scoped
 * read endpoints in the next increment.
 */
export function SsiBotActivityPanel({
  conversation,
}: {
  conversation: ConversationResource
}) {
  const messages = useChatStore((state) => state.messages)
  const activeListConversation = useChatStore((state) =>
    state.conversations.find((item) => item.id === conversation.id),
  )
  const threadState = useThreadControl(activeListConversation)?.state
  const botMessages = useMemo(
    () =>
      messages
        .filter(
          (message) =>
            message.workspaceId === conversation.workspaceId &&
            message.conversationId === conversation.id &&
            message.messageType === "outgoing" &&
            message.senderType === "bot" &&
            !message.deletedAt,
        )
        // Loaded pages and websocket batches are not guaranteed chronological.
        // Sort a copy so the latest events win without mutating Zustand state.
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [conversation.id, conversation.workspaceId, messages],
  )
  const active = isConversationActive(conversation) && threadState !== "standby"
  const botStatus =
    threadState === "standby"
      ? "Bot on standby (channel handoff)"
      : active
        ? "Bot enabled"
        : conversation.botResumeAt
          ? "Bot paused (auto-resume scheduled)"
          : "Human only / bot disabled"

  return (
    <section
      aria-label="SSI automation activity"
      className="mx-3 mt-3 rounded-xl border border-border bg-card p-3 text-sm"
      data-testid="ssi-bot-activity"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <BotIcon aria-hidden="true" className="size-4" />
          Automation activity
        </h2>
        <span
          className={active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
          data-testid="ssi-bot-availability"
        >
          {botStatus}
        </span>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        Recent loaded bot replies for this conversation. Automation may use AI
        or fixed flows; source citations and AI tool traces are not yet available.
      </p>
      {botMessages.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {botMessages.map((message) => (
            <li className="rounded-md bg-muted/60 px-3 py-2" key={message.id}>
              <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs">
                {message.text?.trim() || "Non-text response"}
              </p>
              <time
                className="mt-1 block text-[10px] text-muted-foreground"
                dateTime={new Date(message.createdAt).toISOString()}
              >
                {new Date(message.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
          <UserRoundIcon aria-hidden="true" className="size-3.5" />
          No bot replies in currently loaded messages.
        </p>
      )}
    </section>
  )
}
