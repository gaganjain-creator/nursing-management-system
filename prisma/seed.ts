import "dotenv/config"
import { PrismaClient, Role, EmploymentType, NurseStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

// Clean connection string
let connectionString =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? ""

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL not set")
}

// Remove sslmode from URL because pg handles SSL separately
connectionString = connectionString.replace("sslmode=require", "")

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding database...")

  const password = await bcrypt.hash("Password123!", 12)

  // USERS
  const admin = await prisma.user.upsert({
    where: { email: "admin@nms.local" },
    update: {},
    create: {
      email: "admin@nms.local",
      passwordHash: password,
      role: Role.Admin,
      isActive: true,
    },
  })

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@nms.local" },
    update: {},
    create: {
      email: "supervisor@nms.local",
      passwordHash: password,
      role: Role.Supervisor,
      isActive: true,
    },
  })

  const nurseUser = await prisma.user.upsert({
    where: { email: "nurse@nms.local" },
    update: {},
    create: {
      email: "nurse@nms.local",
      passwordHash: password,
      role: Role.Nurse,
      isActive: true,
    },
  })

  await prisma.user.upsert({
    where: { email: "management@nms.local" },
    update: {},
    create: {
      email: "management@nms.local",
      passwordHash: password,
      role: Role.Management,
      isActive: true,
    },
  })

  console.log("✅ Users created")

  // NURSE PROFILE
  const nurseProfile = await prisma.nurseProfile.upsert({
    where: { userId: nurseUser.id },
    update: {},
    create: {
      userId: nurseUser.id,
      fullName: "Jane Doe",
      dateOfBirth: new Date("1990-06-15"),
      phone: "+61 400 000 000",
      address: "123 Main St, Sydney NSW 2000",
      emergencyContact: "John Doe — +61 400 111 111",
      specialisation: "Critical Care",
      licenseNumber: "NMW-2024-000001",
      employmentType: EmploymentType.FullTime,
      status: NurseStatus.Active,
    },
  })

  console.log("✅ Nurse profile created")

  // DOCUMENT TYPES
  const docTypes = [
    { name: "Working with Children Check", defaultExpiryDays: 1825, alertLeadDays: 90 },
    { name: "Police Check", defaultExpiryDays: 1095, alertLeadDays: 60 },
    { name: "Nursing Registration", defaultExpiryDays: 365, alertLeadDays: 90 },
    { name: "First Aid Certificate", defaultExpiryDays: 730, alertLeadDays: 60 },
    { name: "CPR Certificate", defaultExpiryDays: 365, alertLeadDays: 60 },
    { name: "Immunisation Records", defaultExpiryDays: 3650, alertLeadDays: 180 },
  ]

  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { name: dt.name },
      update: {},
      create: dt,
    })
  }

  console.log("✅ Document types created")

  // FACILITY
 const facility = await prisma.facility.create({
  data: {
    name: "General Hospital — Main Campus",
    isActive: true,
  },
})

  const unitNames = ["ICU", "Emergency", "Ward A", "Ward B", "Paediatrics", "Oncology"]

  for (const name of unitNames) {
    await prisma.unit.create({
      data: {
        name,
        facilityId: facility.id,
      },
    })
  }

  console.log("✅ Facility and units created")

  // SHIFT TYPES
  const shiftTypes = [
    { name: "Morning", defaultStartTime: "07:00", defaultEndTime: "15:00" },
    { name: "Afternoon", defaultStartTime: "15:00", defaultEndTime: "23:00" },
    { name: "Night", defaultStartTime: "23:00", defaultEndTime: "07:00" },
  ]

  for (const st of shiftTypes) {
    await prisma.shiftType.upsert({
      where: { name: st.name },
      update: {},
      create: st,
    })
  }

  console.log("✅ Shift types created")

  // AUDIT LOG
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "CREATE",
      entityType: "NurseProfile",
      entityId: nurseProfile.id,
      newValues: {
        fullName: "Jane Doe",
        licenseNumber: "NMW-2024-000001",
      },
    },
  })

  console.log("✅ Audit log entry created")

  console.log(`
🎉 Seed complete!

Test accounts (password: Password123!)

Admin: admin@nms.local
Supervisor: supervisor@nms.local
Nurse: nurse@nms.local
Management: management@nms.local
`)
}

main()
  .catch((e) => {
    console.error("❌ SEED ERROR:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })