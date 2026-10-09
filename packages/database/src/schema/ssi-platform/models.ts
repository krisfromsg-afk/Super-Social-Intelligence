/**
 * SSI-authored database contracts.
 *
 * Derived from SSI public consumers (auth/workspace/quota/audit services), not
 * copied from the disputed upstream commercial schema. The legacy table names
 * are deliberate compatibility identifiers; do not deploy until migration
 * drift and data preservation are independently verified.
 */
import { sql } from "drizzle-orm"
import {
  boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { bigintAsString, sharedColumns, timestampConfig } from "../../partials/shared"
import { userModel } from "../auth-user"
import { workspaceModel } from "../workspace"

type MailTemplate = { subject?: string; body?: string }

export const tenantModel = pgTable("Tenant", {
  ...sharedColumns,
  ownerId: bigintAsString().references((): AnyPgColumn => userModel.id, {
    onDelete: "restrict", onUpdate: "cascade",
  }),
  status: text().notNull().default("active"),
  disabledReason: text(),
  brandName: text(),
  logoLightPath: text(),
  logoDarkPath: text(),
  faviconPath: text(),
  customCss: text(),
  customJs: text(),
  theme: text(),
  storageUrl: text(),
  policyUrl: text(),
  termsOfServiceUrl: text(),
  signupEmailTemplate: jsonb().$type<MailTemplate>(),
  forgotPasswordEmailTemplate: jsonb().$type<MailTemplate>(),
  magicLinkEmailTemplate: jsonb().$type<MailTemplate>(),
  accountCredentialsEmailTemplate: jsonb().$type<MailTemplate>(),
  hiddenChannels: jsonb().$type<import("@chatbotx.io/utils/channel").ChannelType[]>(),
}, (t) => [uniqueIndex("SSI_Tenant_ownerId_unique").on(t.ownerId)])

export const customDomainModel = pgTable("CustomDomain", {
  ...sharedColumns,
  tenantId: bigintAsString().notNull().references(() => tenantModel.id, { onDelete: "cascade" }),
  domain: text().notNull(),
  status: text().notNull().default("pending"),
}, (t) => [
  uniqueIndex("SSI_CustomDomain_domain_unique").on(t.domain),
  uniqueIndex("SSI_CustomDomain_tenant_unique").on(t.tenantId),
])

export const tenantHelpItemModel = pgTable("TenantHelpItem", {
  ...sharedColumns,
  tenantId: bigintAsString().notNull().references(() => tenantModel.id, { onDelete: "cascade" }),
  name: text().notNull(),
  url: text().notNull(),
  icon: text(),
  position: integer().notNull().default(0),
}, (t) => [index("SSI_TenantHelpItem_tenant_position").on(t.tenantId, t.position)])

export const auditLogModel = pgTable("AuditLog", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  userId: bigintAsString().references(() => userModel.id, { onDelete: "set null" }),
  action: text().notNull(),
  detail: text(),
  ipAddress: text(),
}, (t) => [
  index("SSI_AuditLog_workspace_created").on(t.workspaceId, t.createdAt),
  index("SSI_AuditLog_workspace_user").on(t.workspaceId, t.userId),
])

export const workspaceUsageModel = pgTable("WorkspaceUsage", {
  ...sharedColumns,
  workspaceId: bigintAsString().notNull().references(() => workspaceModel.id, { onDelete: "cascade" }),
  contactsUsed: integer().notNull().default(0),
  channelsUsed: integer().notNull().default(0),
  teamMembersUsed: integer().notNull().default(0),
  botMessagesUsed: integer().notNull().default(0),
  macUsed: integer().notNull().default(0),
  syncedAt: timestamp(timestampConfig).notNull().defaultNow(),
}, (t) => [uniqueIndex("SSI_WorkspaceUsage_workspace_unique").on(t.workspaceId)])

export const userQuotaModel = pgTable("UserQuota", {
  ...sharedColumns,
  userId: bigintAsString().notNull().references(() => userModel.id, { onDelete: "cascade" }),
  contactsLimit: integer(), contactsUsed: integer().notNull().default(0),
  workspacesLimit: integer(), workspacesUsed: integer().notNull().default(0),
  channelsLimit: integer(), channelsUsed: integer().notNull().default(0),
  teamMembersLimit: integer(), teamMembersUsed: integer().notNull().default(0),
  macLimit: integer(), macUsed: integer().notNull().default(0),
  botMessagesLimit: integer(), botMessagesUsed: integer().notNull().default(0),
  monthlyBotMessagesLimit: integer(), monthlyBotMessagesUsed: integer().notNull().default(0),
  monthlyBotMessagesPeriodStart: timestamp(timestampConfig),
  botMessagesTopUpGranted: integer().notNull().default(0),
  whiteLabel: boolean().notNull().default(false),
  ssoSaml: boolean().notNull().default(false),
  saasMode: boolean().notNull().default(false),
  planName: text(), planStatus: text(),
  selectedTrialPlanId: bigintAsString(),
  periodStart: timestamp(timestampConfig),
  periodEnd: timestamp(timestampConfig),
  channelsTornDownAt: timestamp(timestampConfig),
  syncedAt: timestamp(timestampConfig).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("SSI_UserQuota_user_unique").on(t.userId),
  index("SSI_UserQuota_trial_expiry").on(t.planStatus, t.periodEnd),
  index("SSI_UserQuota_active_trial").on(t.userId).where(sql`"channelsTornDownAt" IS NULL AND "planStatus" = 'trial'`),
])
