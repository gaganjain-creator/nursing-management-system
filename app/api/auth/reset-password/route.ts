import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { token, password } = parsed.data

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken) {
    return Response.json({ error: "Invalid or expired reset token", code: "INVALID_TOKEN" }, { status: 400 })
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
    return Response.json({ error: "Reset token has expired", code: "TOKEN_EXPIRED" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  // Delete token first so it cannot be reused, even if the update fails.
  // Both operations are atomic — if either throws, both are rolled back.
  await prisma.$transaction([
    prisma.passwordResetToken.delete({ where: { id: resetToken.id } }),
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
  ])

  return Response.json({ message: "Password updated successfully." })
}
