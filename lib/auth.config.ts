import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import type { Role } from "@prisma/client"

/**
 * Edge-compatible auth config — no Node.js-only imports (no Prisma, no bcrypt).
 * Used by middleware.ts for JWT verification.
 * The full authorize logic with Prisma lives in lib/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Provider declared here for type safety; authorize is overridden in auth.ts
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is overridden in auth.ts; this empty fn satisfies types
      async authorize() {
        return null
      },
    }),
  ],
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
