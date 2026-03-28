import { db } from "../../db";
import { auditLog } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class AuditService {
  async log(params: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }) {
    const [entry] = await db
      .insert(auditLog)
      .values({
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? null,
      })
      .returning();
    return entry;
  }

  async getByEntity(entityType: string, entityId: string, limit = 50) {
    return db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, entityId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  async getByUser(userId: string, limit = 50) {
    return db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  async getRecent(limit = 50) {
    return db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
}
