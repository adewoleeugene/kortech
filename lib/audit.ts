import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonObject;
};

type Client = Pick<typeof db, "auditLog">;

// Pass the transaction client so the log entry commits (or rolls back) with the change.
export function writeAudit(client: Client, entry: AuditEntry) {
  return client.auditLog.create({ data: { ...entry, metadata: entry.metadata ?? {} } });
}
