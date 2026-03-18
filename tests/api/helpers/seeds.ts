/**
 * Shared test fixture data — matches prisma model shapes.
 * Used as return values for prisma mock calls.
 */

export const TEST_ADMIN_USER = {
  id: "test-admin-id",
  email: "admin@nms-test.com",
  role: "Admin" as const,
  isActive: true,
  passwordHash: "$2b$12$hashedpassword",
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  nurseProfile: null,
}

export const TEST_SUPERVISOR_USER = {
  id: "test-supervisor-id",
  email: "supervisor@nms-test.com",
  role: "Supervisor" as const,
  isActive: true,
  passwordHash: "$2b$12$hashedpassword",
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  nurseProfile: null,
}

export const TEST_NURSE_USER = {
  id: "test-nurse-user-id",
  email: "nurse@nms-test.com",
  role: "Nurse" as const,
  isActive: true,
  passwordHash: "$2b$12$hashedpassword",
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

export const TEST_NURSE_PROFILE = {
  id: "test-nurse-profile-id",
  userId: "test-nurse-user-id",
  fullName: "Jane Nurse",
  dateOfBirth: new Date("1990-05-15"),
  phone: "0400000001",
  address: "1 Nurse St, Sydney NSW 2000",
  emergencyContact: "John Nurse 0400000002",
  specialisation: "ICU",
  licenseNumber: "RN-TEST-001",
  employmentType: "FullTime" as const,
  status: "Active" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

export const TEST_SHIFT = {
  id: "test-shift-id",
  date: new Date("2026-04-01T00:00:00Z"),
  startTime: new Date("2026-04-01T07:00:00Z"),
  endTime: new Date("2026-04-01T15:00:00Z"),
  unitId: "unit-001",
  shiftTypeId: "shift-type-001",
  roleRequired: "Nurse" as const,
  status: "Open" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

export const TEST_SHIFT_FULL = {
  ...TEST_SHIFT,
  unit: { id: "unit-001", name: "ICU", facilityId: "facility-001", facility: { id: "facility-001", name: "General Hospital", isActive: true, createdAt: new Date(), updatedAt: new Date() }, createdAt: new Date(), updatedAt: new Date() },
  shiftType: { id: "shift-type-001", name: "Day Shift", defaultStartTime: "07:00", defaultEndTime: "15:00", createdAt: new Date() },
  assignments: [],
}

export const TEST_SHIFT_REQUEST = {
  id: "test-request-id",
  nurseId: "test-nurse-profile-id",
  nurseUserId: "test-nurse-user-id",
  type: "TimeOff" as const,
  shiftId: null,
  requestedDate: new Date("2026-04-10"),
  reason: "Family event",
  status: "Pending" as const,
  reviewedById: null,
  reviewedAt: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

export const TEST_RESET_TOKEN = {
  id: "reset-token-id",
  userId: "test-nurse-user-id",
  token: "valid-reset-token-abc123",
  expiresAt: new Date(Date.now() + 3_600_000),
  createdAt: new Date(),
  user: TEST_NURSE_USER,
}
