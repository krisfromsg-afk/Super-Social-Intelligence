CREATE TABLE "SsiAiRun" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"conversationId" bigint NOT NULL,
	"actorId" bigint NOT NULL,
	"agentId" bigint NOT NULL,
	"requestKey" text NOT NULL,
	"status" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"personaVersion" integer,
	"inputDigest" text NOT NULL,
	"outputDigest" text,
	"outputTokenLimit" integer NOT NULL,
	"inputTokens" integer,
	"outputTokens" integer,
	"providerResponseId" text,
	"errorCode" text,
	"finishedAt" timestamp(6) with time zone,
	"sources" jsonb DEFAULT '[]' NOT NULL,
	CONSTRAINT "SsiAiRun_status_check" CHECK ("status" in ('reserved', 'completed', 'failed', 'discarded')),
	CONSTRAINT "SsiAiRun_token_limit_check" CHECK ("outputTokenLimit" between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "SsiCopilotOutbox" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"conversationId" bigint NOT NULL,
	"contactInboxId" bigint NOT NULL,
	"draftVersion" integer NOT NULL,
	"modeVersion" integer NOT NULL,
	"actorId" bigint NOT NULL,
	"text" text NOT NULL,
	"textDigest" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"messageId" bigint NOT NULL,
	"messageCreatedAt" timestamp(6) with time zone NOT NULL,
	"claimToken" text,
	"claimedAt" timestamp(6) with time zone,
	"expiresAt" timestamp(6) with time zone NOT NULL,
	"providerMessageIds" jsonb DEFAULT '[]' NOT NULL,
	"errorCode" text,
	CONSTRAINT "SsiCopilotOutbox_status_check" CHECK ("status" in ('queued', 'sending', 'sent', 'unknown', 'cancelled', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "SsiCopilotRevision" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"conversationId" bigint NOT NULL,
	"version" integer NOT NULL,
	"modeVersion" integer NOT NULL,
	"actorId" bigint NOT NULL,
	"event" text NOT NULL,
	"textDigest" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	CONSTRAINT "SsiCopilotRevision_event_check" CHECK ("event" in ('operator_save', 'ai_generation', 'approve', 'reject')),
	CONSTRAINT "SsiCopilotRevision_version_check" CHECK ("version" > 0 and "modeVersion" > 0)
);
--> statement-breakpoint
CREATE TABLE "SsiKnowledgeChunk" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"versionId" bigint NOT NULL,
	"ordinal" integer NOT NULL,
	"content" text NOT NULL,
	"digest" text NOT NULL,
	CONSTRAINT "SsiKnowledgeChunk_content_check" CHECK (length("content") between 1 and 16000)
);
--> statement-breakpoint
CREATE TABLE "SsiKnowledgeVersion" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"fileId" bigint NOT NULL,
	"version" integer NOT NULL,
	"publishedBy" bigint NOT NULL,
	"name" text NOT NULL,
	"digest" text NOT NULL,
	"chunkCount" integer NOT NULL,
	CONSTRAINT "SsiKnowledgeVersion_bounds_check" CHECK ("version" > 0 and "chunkCount" between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "SsiPersonaVersion" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"workspaceId" bigint NOT NULL,
	"agentId" bigint NOT NULL,
	"version" integer NOT NULL,
	"publishedBy" bigint NOT NULL,
	"digest" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"rollbackOfVersion" integer,
	CONSTRAINT "SsiPersonaVersion_version_check" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "SsiAiRun_workspace_conversation_request_key" ON "SsiAiRun" ("workspaceId","conversationId","requestKey");--> statement-breakpoint
CREATE INDEX "SsiAiRun_workspace_created_idx" ON "SsiAiRun" ("workspaceId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "SsiCopilotOutbox_workspace_conversation_version_key" ON "SsiCopilotOutbox" ("workspaceId","conversationId","draftVersion");--> statement-breakpoint
CREATE UNIQUE INDEX "SsiCopilotOutbox_message_key" ON "SsiCopilotOutbox" ("messageId");--> statement-breakpoint
CREATE INDEX "SsiCopilotOutbox_status_created_idx" ON "SsiCopilotOutbox" ("status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "SsiCopilotRevision_workspace_conversation_version_key" ON "SsiCopilotRevision" ("workspaceId","conversationId","version");--> statement-breakpoint
CREATE UNIQUE INDEX "SsiKnowledgeChunk_version_ordinal_key" ON "SsiKnowledgeChunk" ("versionId","ordinal");--> statement-breakpoint
CREATE INDEX "SsiKnowledgeChunk_workspace_version_idx" ON "SsiKnowledgeChunk" ("workspaceId","versionId");--> statement-breakpoint
CREATE UNIQUE INDEX "SsiKnowledgeVersion_workspace_file_version_key" ON "SsiKnowledgeVersion" ("workspaceId","fileId","version");--> statement-breakpoint
CREATE UNIQUE INDEX "SsiPersonaVersion_workspace_agent_version_key" ON "SsiPersonaVersion" ("workspaceId","agentId","version");--> statement-breakpoint
ALTER TABLE "SsiAiRun" ADD CONSTRAINT "SsiAiRun_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiAiRun" ADD CONSTRAINT "SsiAiRun_conversationId_Conversation_id_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiCopilotOutbox" ADD CONSTRAINT "SsiCopilotOutbox_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiCopilotOutbox" ADD CONSTRAINT "SsiCopilotOutbox_conversationId_Conversation_id_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiCopilotRevision" ADD CONSTRAINT "SsiCopilotRevision_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiCopilotRevision" ADD CONSTRAINT "SsiCopilotRevision_conversationId_Conversation_id_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiKnowledgeChunk" ADD CONSTRAINT "SsiKnowledgeChunk_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiKnowledgeChunk" ADD CONSTRAINT "SsiKnowledgeChunk_versionId_SsiKnowledgeVersion_id_fkey" FOREIGN KEY ("versionId") REFERENCES "SsiKnowledgeVersion"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiKnowledgeVersion" ADD CONSTRAINT "SsiKnowledgeVersion_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiKnowledgeVersion" ADD CONSTRAINT "SsiKnowledgeVersion_fileId_AIFile_id_fkey" FOREIGN KEY ("fileId") REFERENCES "AIFile"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiPersonaVersion" ADD CONSTRAINT "SsiPersonaVersion_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "SsiPersonaVersion" ADD CONSTRAINT "SsiPersonaVersion_agentId_AIAgent_id_fkey" FOREIGN KEY ("agentId") REFERENCES "AIAgent"("id") ON DELETE CASCADE;