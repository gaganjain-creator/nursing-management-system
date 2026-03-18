/**
 * Shift request endpoint tests
 *
 * POST  /api/shift-requests       — Nurse only
 * PATCH /api/shift-requests/[id]  — Admin | Supervisor
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import { createRouteServer } from "./helpers/server"
import { adminSession, nurseSession, supervisorSession } from "./helpers/sessions"
import { TEST_NURSE_PROFILE, TEST_SHIFT_REQUEST } from "./helpers/seeds"

// ── module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    nurseProfile: { findUnique: vi.fn() },
    shiftRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: { findMany: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { POST } from "@/app/api/shift-requests/route"
import { PATCH } from "@/app/api/shift-requests/[id]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createApp = createRouteServer(POST as Parameters<typeof createRouteServer>[0])
const patchApp = createRouteServer(
  PATCH as Parameters<typeof createRouteServer>[0],
  (p) => ({ id: p.split("/").at(-1) ?? "" })
)

const authMock = vi.mocked(auth)
const prismaMock = vi.mocked(prisma)

// ── POST /api/shift-requests ──────────────────────────────────────────────────
describe("POST /api/shift-requests", () => {
  const timeOffPayload = {
    type: "TimeOff",
    requestedDate: "2026-04-10",
    reason: "Family event",
  }
  const swapPayload = {
    type: "SwapRequest",
    shiftId: "test-shift-id",
    reason: "Personal conflict",
  }

  beforeEach(() => {
    authMock.mockResolvedValue(nurseSession)
    prismaMock.nurseProfile.findUnique.mockResolvedValue(TEST_NURSE_PROFILE)
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        const tx = {
          shiftRequest: {
            create: vi.fn().mockResolvedValue(TEST_SHIFT_REQUEST),
          },
          user: { findMany: vi.fn().mockResolvedValue([]) },
          notification: { createMany: vi.fn() },
        }
        return cb(tx)
      }
      return Promise.all(cb as Promise<unknown>[])
    })
  })

  it("creates a TimeOff request and returns 201 for Nurse", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(timeOffPayload)
    expect(res.status).toBe(201)
    expect(res.body.type).toBe("TimeOff")
  })

  it("creates a SwapRequest and returns 201 for Nurse", async () => {
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        const tx = {
          shiftRequest: {
            create: vi.fn().mockResolvedValue({ ...TEST_SHIFT_REQUEST, type: "SwapRequest" }),
          },
          user: { findMany: vi.fn().mockResolvedValue([]) },
          notification: { createMany: vi.fn() },
        }
        return cb(tx)
      }
      return Promise.all(cb as Promise<unknown>[])
    })
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(swapPayload)
    expect(res.status).toBe(201)
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(createApp).post("/").send(timeOffPayload)
    expect(res.status).toBe(401)
    expect(res.body.code).toBe("UNAUTHORIZED")
  })

  it("returns 403 for Admin role (only Nurses may create requests)", async () => {
    authMock.mockResolvedValue(adminSession)
    const res = await request(createApp).post("/").send(timeOffPayload)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe("FORBIDDEN")
  })

  it("returns 403 for Supervisor role", async () => {
    authMock.mockResolvedValue(supervisorSession)
    const res = await request(createApp).post("/").send(timeOffPayload)
    expect(res.status).toBe(403)
  })

  it("returns 404 when nurse has no profile", async () => {
    prismaMock.nurseProfile.findUnique.mockResolvedValue(null)
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send(timeOffPayload)
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 400 when reason is missing", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ type: "TimeOff", requestedDate: "2026-04-10" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for an invalid request type", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({ type: "Vacation", reason: "Holiday" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when body is empty", async () => {
    const res = await request(createApp)
      .post("/")
      .set("Content-Type", "application/json")
      .send({})
    expect(res.status).toBe(400)
  })
})

// ── PATCH /api/shift-requests/[id] ───────────────────────────────────────────
describe("PATCH /api/shift-requests/[id]", () => {
  const existingPendingRequest = {
    ...TEST_SHIFT_REQUEST,
    nurse: { userId: "test-nurse-user-id", fullName: "Jane Nurse" },
  }

  beforeEach(() => {
    authMock.mockResolvedValue(adminSession)
    prismaMock.shiftRequest.findUnique.mockResolvedValue(existingPendingRequest)
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        const tx = {
          shiftRequest: {
            update: vi.fn().mockResolvedValue({ ...TEST_SHIFT_REQUEST, status: "Approved" }),
          },
          notification: { create: vi.fn() },
        }
        return cb(tx)
      }
      return Promise.all(cb as Promise<unknown>[])
    })
  })

  it("approves a pending request and returns 200 for Admin", async () => {
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .set("Content-Type", "application/json")
      .send({ status: "Approved" })
    expect(res.status).toBe(200)
  })

  it("rejects a pending request with notes for Supervisor", async () => {
    authMock.mockResolvedValue(supervisorSession)
    prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        const tx = {
          shiftRequest: {
            update: vi.fn().mockResolvedValue({ ...TEST_SHIFT_REQUEST, status: "Rejected", notes: "Not approved" }),
          },
          notification: { create: vi.fn() },
        }
        return cb(tx)
      }
      return Promise.all(cb as Promise<unknown>[])
    })
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .set("Content-Type", "application/json")
      .send({ status: "Rejected", notes: "Not approved" })
    expect(res.status).toBe(200)
  })

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .send({ status: "Approved" })
    expect(res.status).toBe(401)
  })

  it("returns 403 for Nurse role (only Admin/Supervisor may review)", async () => {
    authMock.mockResolvedValue(nurseSession)
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .send({ status: "Approved" })
    expect(res.status).toBe(403)
  })

  it("returns 404 when request does not exist", async () => {
    prismaMock.shiftRequest.findUnique.mockResolvedValue(null)
    const res = await request(patchApp)
      .patch(`/api/shift-requests/nonexistent-id`)
      .set("Content-Type", "application/json")
      .send({ status: "Approved" })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe("NOT_FOUND")
  })

  it("returns 400 when request has already been reviewed (not Pending)", async () => {
    prismaMock.shiftRequest.findUnique.mockResolvedValue({
      ...existingPendingRequest,
      status: "Approved",
    })
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .set("Content-Type", "application/json")
      .send({ status: "Rejected" })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("INVALID_STATE")
  })

  it("returns 400 for an invalid status value", async () => {
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .set("Content-Type", "application/json")
      .send({ status: "Pending" }) // Pending is not valid for review
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when status is missing from body", async () => {
    const res = await request(patchApp)
      .patch(`/api/shift-requests/${TEST_SHIFT_REQUEST.id}`)
      .set("Content-Type", "application/json")
      .send({ notes: "Some note" })
    expect(res.status).toBe(400)
  })
})
