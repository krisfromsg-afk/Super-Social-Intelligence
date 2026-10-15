/** SSI-authored, workspace-scoped AI evidence. No credentials or reasoning text. */
import { sql } from "drizzle-orm"
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { bigintAsString, sharedColumns, timestampConfig } from "../partials/shared"
import { aiAgentModel } from "./ai-agent"
import { aiFileModel } from "./ai-file"
import { conversationModel } from "./conversation"
import { workspaceModel } from "./workspace"

// No relations to optional model/provider ids: deleting an agent must not erase
// conversation audit evidence. Workspace deletion, in contrast, removes it all.
export const ssiAiRunModel = pgTable("SsiAiRun", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  conversationId: bigintAsString().notNull().references(() => conversationModel.id, { onDelete: "cascade" }),
  actorId: bigintAsString().notNull(),
  agentId: bigintAsString().notNull(),
  requestKey: text().notNull(),
  status: text().notNull(),
  provider: text().notNull(),
  model: text().notNull(),
  personaVersion: integer(),
  inputDigest: text().notNull(),
  outputDigest: text(),
  outputTokenLimit: integer().notNull(),
  inputTokens: integer(),
  outputTokens: integer(),
  providerResponseId: text(),
  errorCode: text(),
  finishedAt: timestamp(timestampConfig),
  // Exact published knowledge revisions and chunk hashes, not raw tool results.
  sources: jsonb().$type<Array<{ fileId: string; version: number; chunkId: string; digest: string }>>().notNull().default(sql`'[]'::jsonb`),
}, (t) => [
  uniqueIndex("SsiAiRun_workspace_conversation_request_key").on(t.workspaceId, t.conversationId, t.requestKey),
  index("SsiAiRun_workspace_created_idx").on(t.workspaceId, t.createdAt),
  check("SsiAiRun_status_check", sql`${t.status} in ('reserved', 'completed', 'failed', 'discarded')`),
  check("SsiAiRun_token_limit_check", sql`${t.outputTokenLimit} between 1 and 2000`),
])

export const ssiCopilotRevisionModel = pgTable("SsiCopilotRevision", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  conversationId: bigintAsString().notNull().references(() => conversationModel.id, { onDelete: "cascade" }),
  version: integer().notNull(),
  modeVersion: integer().notNull(),
  actorId: bigintAsString().notNull(),
  event: text().notNull(),
  textDigest: text().notNull(),
  // Projection is private: only the full-contacts/member-authorized API reads it.
  // JSONB conversation state remains for backwards compatibility, but this table
  // preserves every subsequent revision/review in the same transaction.
  snapshot: jsonb().$type<Record<string, unknown>>().notNull(),
}, (t) => [
  uniqueIndex("SsiCopilotRevision_workspace_conversation_version_key").on(t.workspaceId, t.conversationId, t.version),
  check("SsiCopilotRevision_event_check", sql`${t.event} in ('operator_save', 'ai_generation', 'approve', 'reject')`),
  check("SsiCopilotRevision_version_check", sql`${t.version} > 0 and ${t.modeVersion} > 0`),
])

export const ssiCopilotOutboxModel = pgTable("SsiCopilotOutbox", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  conversationId: bigintAsString().notNull().references(() => conversationModel.id, { onDelete: "cascade" }),
  contactInboxId: bigintAsString().notNull(),
  draftVersion: integer().notNull(),
  modeVersion: integer().notNull(),
  actorId: bigintAsString().notNull(),
  text: text().notNull(),
  textDigest: text().notNull(),
  status: text().notNull().default("queued"),
  // A generated message id is stable across queue redelivery. It is not a
  // provider idempotency guarantee. Unknown provider outcomes NEVER auto-retry.
  messageId: bigintAsString().notNull(),
  messageCreatedAt: timestamp(timestampConfig).notNull(),
  claimToken: text(),
  claimedAt: timestamp(timestampConfig),
  expiresAt: timestamp(timestampConfig).notNull(),
  providerMessageIds: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  errorCode: text(),
}, (t) => [
  uniqueIndex("SsiCopilotOutbox_workspace_conversation_version_key").on(t.workspaceId, t.conversationId, t.draftVersion),
  uniqueIndex("SsiCopilotOutbox_message_key").on(t.messageId),
  index("SsiCopilotOutbox_status_created_idx").on(t.status, t.createdAt),
  check("SsiCopilotOutbox_status_check", sql`${t.status} in ('queued', 'sending', 'sent', 'unknown', 'cancelled', 'failed')`),
])

export const ssiPersonaVersionModel = pgTable("SsiPersonaVersion", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  agentId: bigintAsString().notNull().references(() => aiAgentModel.id, { onDelete: "cascade" }),
  version: integer().notNull(),
  publishedBy: bigintAsString().notNull(),
  digest: text().notNull(),
  snapshot: jsonb().$type<Record<string, unknown>>().notNull(),
  rollbackOfVersion: integer(),
}, (t) => [
  uniqueIndex("SsiPersonaVersion_workspace_agent_version_key").on(t.workspaceId, t.agentId, t.version),
  check("SsiPersonaVersion_version_check", sql`${t.version} > 0`),
])

export const ssiKnowledgeVersionModel = pgTable("SsiKnowledgeVersion", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  fileId: bigintAsString().notNull().references(() => aiFileModel.id, { onDelete: "cascade" }),
  version: integer().notNull(),
  publishedBy: bigintAsString().notNull(),
  name: text().notNull(),
  digest: text().notNull(),
  chunkCount: integer().notNull(),
}, (t) => [
  uniqueIndex("SsiKnowledgeVersion_workspace_file_version_key").on(t.workspaceId, t.fileId, t.version),
  check("SsiKnowledgeVersion_bounds_check", sql`${t.version} > 0 and ${t.chunkCount} between 1 and 500`),
])

export const ssiKnowledgeChunkModel = pgTable("SsiKnowledgeChunk", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  versionId: bigintAsString().notNull().references(() => ssiKnowledgeVersionModel.id, { onDelete: "cascade" }),
  ordinal: integer().notNull(),
  content: text().notNull(),
  digest: text().notNull(),
  // These immutable snapshots use lexical retrieval. Legacy vectors have no
  // model lineage and MUST NOT be silently relabelled as verified hybrid RAG.
}, (t) => [
  uniqueIndex("SsiKnowledgeChunk_version_ordinal_key").on(t.versionId, t.ordinal),
  index("SsiKnowledgeChunk_workspace_version_idx").on(t.workspaceId, t.versionId),
  check("SsiKnowledgeChunk_content_check", sql`length(${t.content}) between 1 and 16000`),
])
