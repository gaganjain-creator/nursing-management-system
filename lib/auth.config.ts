import type { NextAuthConfig } from "next-auth"
import type { Role } from "@prisma/client"

/**
 * Edge-compatible auth config — no Node.js-only imports (no Prisma, no bcrypt).
 * Used by middleware.ts for JWT verification.
 * The full authorize logic with Prisma lives in lib/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { id: string; role: Role }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      return session
    },
  },
}
