import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
})

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = markReadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { ids, all } = parsed.data

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })
  } else if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, id: { in: ids } },
      data: { isRead: true },
    })
  }

  return NextResponse.json({ ok: true })
}
