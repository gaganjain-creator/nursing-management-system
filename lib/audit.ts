import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function writeAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
}: {
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues !== undefined
        ? (oldValues as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      newValues: newValues !== undefined
        ? (newValues as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  })
}
