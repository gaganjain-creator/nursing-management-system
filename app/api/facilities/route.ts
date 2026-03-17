import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    include: { units: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(facilities)
}
