import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = {
  workspaceId: string;
  userId?: string | null;
  actorType: "user" | "api_key" | "system";
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function auditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
