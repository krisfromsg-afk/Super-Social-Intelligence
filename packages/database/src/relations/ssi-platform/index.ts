/**
 * SSI-owned relation wiring. Workspace and user scoping is enforced by
 * services; these relations must never be treated as an authorization gate.
 */
import { defineRelationsPart } from "drizzle-orm"
// biome-ignore lint/performance/noNamespaceImport: drizzle schema
import * as schema from "../../schema"

export const ssiPlatformRelations = defineRelationsPart(schema, (r) => ({
  tenantModel: {
    owner: r.one.userModel({ from: r.tenantModel.ownerId, to: r.userModel.id }),
    helpItems: r.many.tenantHelpItemModel({ from: r.tenantModel.id, to: r.tenantHelpItemModel.tenantId }),
  },
  customDomainModel: {
    tenant: r.one.tenantModel({ from: r.customDomainModel.tenantId, to: r.tenantModel.id }),
  },
  tenantHelpItemModel: {
    tenant: r.one.tenantModel({ from: r.tenantHelpItemModel.tenantId, to: r.tenantModel.id }),
  },
  auditLogModel: {
    user: r.one.userModel({ from: r.auditLogModel.userId, to: r.userModel.id }),
    workspace: r.one.workspaceModel({ from: r.auditLogModel.workspaceId, to: r.workspaceModel.id }),
  },
  workspaceUsageModel: {
    workspace: r.one.workspaceModel({ from: r.workspaceUsageModel.workspaceId, to: r.workspaceModel.id }),
  },
  userQuotaModel: {
    user: r.one.userModel({ from: r.userQuotaModel.userId, to: r.userModel.id }),
  },
}))
