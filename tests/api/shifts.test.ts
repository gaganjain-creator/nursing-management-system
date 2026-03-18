/**
 * Shift endpoint tests
 *
 * POST /api/shifts              — Admin | Supervisor
 * POST /api/shifts/[id]/assign  — Admin | Supervisor
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import { createRouteServer } from "./helpers/server"
import { adminSession, nurseSession, supervisorSession } from "./helpers/sessions"
import { TEST_NURSE_PROFILE, TEST_SHIFT, TEST_SHIFT_FULL } from "./helpers/seeds"

// ── module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shift: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    shiftAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    nurseProfile: { findUnique: vi.fn() },
    nurseAvailability: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { POST } from "@/app/api/shifts/route"
import { POST as assignPost } from "@/app/api/shifts/[id]/assign/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createApp = createRouteServer(POST as Parameters<typeof createRouteServer>[0])
const assignApp = createRouteServer(
  assignPost as Parameters<typeof createRouteServer>[0],
  (p) => {
    // /api/shifts/:id/assign  →  id = second-to-last segment
    const parts = p.split("/")
    return { id: parts.at(-2) ?? "" }
  }
)

const authMock = vi.mocked(auth)
const prismaMock = vi.mocked(prisma)

const validShiftPayload = {
  date: "2026-04-01",
  startTime: "2026-04-01T07:00:00Z",
  endTime: "2026-04-01T15:00:00Z",
  unitId: "unit-001",
  shiftTypeId: "shift-type-001",
  roleRequired: "Nurse",
}

// ── POST /api/shifts ──────────────────────────────────────────────────────────
describe("POST /api/shifts", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.shift.create.mockResolvedValue(TEST_SHIFT_FULL)
  })

  it("creates a shift and returns 201 for Admin", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validShiftPayload)
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(TEST_SHIFT_FULL.id)
  })

  it("creates a shift and returns 201 for Supervisor", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(validShiftPayload)
    expect(res.status).toBe(201)
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(createApp).post("/").send(validShiftPayload)
    expect(res.status).toBe(401)
    expect(res.body.code).toBe("UNAUTHORIZED")
  })

  it("returns 403 for Nurse role", async () => {
    authMock.mockResolvedValue(nurseSession)
    const res = await request(createApp).post("/").send(validShiftPayload)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })

  it("returns 400 when endTime is before startTime", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({
        ...validShiftPayload,
        startTime: "2026-04-01T15:00:00Z",
        endTime: "2026-04-01T07:00:00Z",
      })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for invalid roleRequired", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ ...validShiftPayload, roleRequired: "Receptionist" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when required fields are missing", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ date: "2026-04-01" })
    expect(res.status).toBe(400)
  })
})

// ── POST /api/shifts/[id]/assign ──────────────────────────────────────────────
describe("POST /api/shifts/[id]/assign", () => {
  const assignedShift = {
    id: "test-shift-id",
    assignedAt: new Date(),
    shiftId: TEST_SHIFT.id,
    nurseId: TEST_NURSE_PROFILE.id,
    nurseUserId: TEST_NURSE_PROFILE.userId,
    assignedById: adminSession.user.id,
  }

  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.shift.findUnique.mockResolvedValue(TEST_SHIFT)
    prismaMock.nurseProfile.findUnique.mockResolvedValue(TEST_NURSE_PROFILE)
    prismaMock.nurseAvailability.findUnique.mockResolvedValue(null) // no record = available
    prismaMock.shiftAssignment.findUnique.mockResolvedValue(null)
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        const tx = {
          shiftAssignment: { create: vi.fn().mockResolvedValue(assignedShift) },
          shift: { update: vi.fn() },
          notification: { create: vi.fn() },
        }
        return cb(tx)
      }
      return Promise.all(cb as Promise<unknown>[])
    })
  })

  it("assigns nurse to shift and returns 201", async () => {
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .set("Content-Type", "application/json")
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(201)
    expect(res.body.nurseId).toBe(TEST_NURSE_PROFILE.id)
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(401)
  })

  it("returns 403 for Nurse role", async () => {
    authMock.mockResolvedValue(nurseSession)
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(403)
  })

  it("returns 404 when shift does not exist", async () => {
    prismaMock.shift.findUnique.mockResolvedValue(null)
    const res = await request(assignApp)
      .post(`/api/shifts/nonexistent-shift/assign`)
      .set("Content-Type", "application/json")
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 400 when shift is cancelled", async () => {
    prismaMock.shift.findUnique.mockResolvedValue({ ...TEST_SHIFT, status: "Cancelled" })
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .set("Content-Type", "application/json")
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("INVALID_STATE")
  })

  it("returns 404 when nurse profile does not exist", async () => {
    prismaMock.nurseProfile.findUnique.mockResolvedValue(null)
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .set("Content-Type", "application/json")
      .send({ nurseProfileId: "bad-nurse-id" })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 403 when nurse is marked unavailable on shift date", async () => {
    prismaMock.nurseAvailability.findUnique.mockResolvedValue({
      id: "avail-001",
      nurseId: TEST_NURSE_PROFILE.id,
      nurseUserId: TEST_NURSE_PROFILE.userId,
      date: new Date("2026-04-01"),
      isAvailable: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .set("Content-Type", "application/json")
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("NURSE_UNAVAILABLE")
  })

  it("returns 409 when nurse is already assigned to this shift", async () => {
    prismaMock.shiftAssignment.findUnique.mockResolvedValue(assignedShift)
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .set("Content-Type", "application/json")
      .send({ nurseProfileId: TEST_NURSE_PROFILE.id })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe("ALREADY_ASSIGNED")
  })

  it("returns 400 when nurseProfileId is missing from body", async () => {
    const res = await request(assignApp)
      .post(`/api/shifts/${TEST_SHIFT.id}/assign`)
      .set("Content-Type", "application/json")
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })
})
