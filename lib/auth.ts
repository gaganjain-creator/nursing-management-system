import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        console.log("[auth] login attempt:", parsed.data.email)

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        console.log("[auth] user found:", user ? `yes (active=${user.isActive})` : "no")

        if (!user || !user.isActive) return null

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )

        console.log("[auth] bcrypt.compare result:", passwordValid)

        if (!passwordValid) return null

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
})
