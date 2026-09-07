import { dbAdmin } from "./db";
import type { StaffSession } from "./auth";

export function audit(actor: StaffSession | null, action: string, entity: string, entityId: string, before?: unknown, after?: unknown, ip?: string) {
  return dbAdmin.auditLog.create({
    data: { actorId: actor?.id, actorRole: actor?.role, action, entity, entityId, before: before as object | undefined, after: after as object | undefined, ip },
  });
}
