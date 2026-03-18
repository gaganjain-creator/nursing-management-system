import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./lib/auth.config"

const { auth } = NextAuth(authConfig)

function getRoleDashboard(role: string): string {
  const map: Record<string, string> = {
    Admin: "/admin",
    Supervisor: "/supervisor",
    Nurse: "/nurse",
    Management: "/management",
  }
  return map[role] ?? "/login"
}

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role as string | undefined
  const path = req.nextUrl.pathname

  // Root redirect
  if (path === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.nextUrl))
    }

    return NextResponse.redirect(
      new URL(getRoleDashboard(role ?? ""), req.nextUrl)
    )
  }

  // Auth pages
  if (path === "/login" || path.startsWith("/reset-password")) {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(getRoleDashboard(role ?? ""), req.nextUrl)
      )
    }
    return NextResponse.next()
  }

  // Require login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("callbackUrl", path)
    return NextResponse.redirect(loginUrl)
  }

  const currentRole = role ?? ""

  // Role guards
  if (path.startsWith("/admin") && currentRole !== "Admin") {
    return NextResponse.redirect(
      new URL(getRoleDashboard(currentRole), req.nextUrl)
    )
  }

  if (
    path.startsWith("/supervisor") &&
    currentRole !== "Supervisor" &&
    currentRole !== "Admin"
  ) {
    return NextResponse.redirect(
      new URL(getRoleDashboard(currentRole), req.nextUrl)
    )
  }

  if (path.startsWith("/nurse") && currentRole !== "Nurse") {
    return NextResponse.redirect(
      new URL(getRoleDashboard(currentRole), req.nextUrl)
    )
  }

  if (
    path.startsWith("/management") &&
    currentRole !== "Management" &&
    currentRole !== "Admin"
  ) {
    return NextResponse.redirect(
      new URL(getRoleDashboard(currentRole), req.nextUrl)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}