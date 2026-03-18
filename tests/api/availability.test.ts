/**
 * Availability endpoint tests
 *
 * POST /api/availability — Nurse only (upserts their availability for a date)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import { createRouteServer } from "./helpers/server"
import { adminSession, nurseSession, supervisorSession } from "./helpers/sessions"
import { TEST_NURSE_PROFILE } from "./helpers/seeds"

// ── module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    nurseProfile: { findUnique: vi.fn() },
    nurseAvailability: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { POST } from "@/app/api/availability/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const postApp = createRouteServer(POST as Parameters<typeof createRouteServer>[0])

const authMock = vi.mocked(auth)
const prismaMock = vi.mocked(prisma)

const availabilityRecord = {
  id: "avail-001",
  nurseId: TEST_NURSE_PROFILE.id,
  nurseUserId: TEST_NURSE_PROFILE.userId,
  date: new Date("2026-04-10T00:00:00Z"),
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ── POST /api/availability ────────────────────────────────────────────────────
describe("POST /api/availability", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(nurseSession)
    prismaMock.nurseProfile.findUnique.mockResolvedValue(TEST_NURSE_PROFILE)
    prismaMock.nurseAvailability.upsert.mockResolvedValue(availabilityRecord)
  })

  it("sets availability to true and returns 201 for Nurse", async () => {
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-10", isAvailable: true })
    expect(res.status).toBe(201)
    expect(res.body.isAvailable).toBe(true)
  })

  it("sets availability to false (marks unavailable) and returns 201", async () => {
    prismaMock.nurseAvailability.upsert.mockResolvedValue({
      ...availabilityRecord,
      isAvailable: false,
    })
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-10", isAvailable: false })
    expect(res.status).toBe(201)
    expect(res.body.isAvailable).toBe(false)
  })

  it("upserts (updates existing record) and returns 201", async () => {
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-10", isAvailable: true })
    expect(res.status).toBe(201)
    expect(prismaMock.nurseAvailability.upsert).toHaveBeenCalled()
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(postApp)
      .post("/")
      .send({ date: "2026-04-10", isAvailable: true })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe("UNAUTHORIZED")
  })

  it("returns 403 for Admin role (only Nurses may set availability)", async () => {
    authMock.mockResolvedValue(adminSession)
    const res = await request(postApp)
      .post("/")
      .send({ date: "2026-04-10", isAvailable: true })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })

  it("returns 403 for Supervisor role", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(postApp)
      .post("/")
      .send({ date: "2026-04-10", isAvailable: true })
    expect(res.status).toBe(403)
  })

  it("returns 404 when nurse has no profile", async () => {
    prismaMock.nurseProfile.findUnique.mockResolvedValue(null)
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-10", isAvailable: true })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 400 when date is missing", async () => {
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ isAvailable: true })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when isAvailable is missing", async () => {
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-10" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when isAvailable is a string instead of boolean", async () => {
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-10", isAvailable: "yes" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when body is empty", async () => {
    const res = await request(postApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({})
    expect(res.status).toBe(400)
  })
})
