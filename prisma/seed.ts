import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "argon2"

// Prisma 7 requires the adapter even in the seed file
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("\n🌱 Seeding database...\n")

  const password = await hash("Test@1234", {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })

  // Create one user per role for demo purposes
  const roleData = [
    { email: "user@demo.com",        role: "USER"         },
    { email: "bank@demo.com",        role: "OFFICER_BANK" },
    { email: "npci@demo.com",        role: "OFFICER_NPCI" },
    { email: "ombudsman@demo.com",   role: "OMBUDSMAN"    },
    { email: "cyber@demo.com",       role: "CYBERCRIME"   },
    { email: "juror@demo.com",       role: "JUROR"        },
    { email: "admin@demo.com",       role: "ADMIN"        },
    { email: "auditor@demo.com",     role: "AUDITOR"      },
  ] as const

  const users: Record<string, string> = {} // role → userId

  for (const { email, role } of roleData) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: password,
        role,
        emailVerified: true,
      },
    })
    users[role] = user.id
    console.log(`  ✓  ${role.padEnd(14)} ${email}`)
  }

  console.log("\n  Password for all demo accounts: Test@1234\n")

  // Seed demo cases attached to the USER account
  const userId = users["USER"]

  const caseSeed = [
    {
      disputeType: "FAILED_TXN"           as const,
      severity:    "MEDIUM"               as const,
      status:      "UNDER_REVIEW"         as const,
      assignedTo:  "BANK"                 as const,
      description:
        "I made a UPI payment of ₹5000 to my friend but the amount was debited from my account and the transaction shows failed. The amount has not been refunded for 5 days.",
      amount: 5000,
      transactionId: "UPI202401150001",
      bankName: "HDFC Bank",
      appUsed: "Google Pay",
    },
    {
      disputeType: "PHISHING"             as const,
      severity:    "HIGH"                 as const,
      status:      "JUROR_REVIEW"         as const,
      assignedTo:  "CYBERCRIME"           as const,
      description:
        "I received a call from someone claiming to be from my bank. They asked me to install a remote access app and share an OTP. ₹45,000 was debited from my account immediately after.",
      amount: 45000,
      bankName: "SBI",
      appUsed: "PhonePe",
    },
    {
      disputeType: "REFUND_DELAY"         as const,
      severity:    "LOW"                  as const,
      status:      "FILED"               as const,
      assignedTo:  "BANK"                as const,
      description:
        "I returned a product to an online merchant 3 weeks ago. The merchant confirmed the refund but the amount has not appeared in my account.",
      amount: 2499,
      bankName: "ICICI Bank",
      appUsed: "Paytm",
    },
    {
      disputeType: "UNAUTHORIZED_PAYMENT" as const,
      severity:    "HIGH"                 as const,
      status:      "ESCALATED"            as const,
      assignedTo:  "NPCI"                 as const,
      description:
        "Three transactions of ₹9,999 each were made from my account without my knowledge between 2 AM and 3 AM. I did not receive any OTP for these transactions.",
      amount: 29997,
      bankName: "Axis Bank",
      appUsed: "BHIM",
    },
    {
      disputeType: "MERCHANT_SCAM"        as const,
      severity:    "MEDIUM"               as const,
      status:      "RESOLVED"             as const,
      assignedTo:  "CONSUMER_FORUM"       as const,
      description:
        "I paid ₹12,000 to an online seller for a laptop. The seller delivered a box filled with bricks and stopped responding after delivery.",
      amount: 12000,
      bankName: "Kotak Bank",
      appUsed: "Amazon Pay",
    },
  ]

  for (const data of caseSeed) {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.case.create({
      data: {
        userId,
        ...data,
        slaDeadline: sevenDaysFromNow,
        aiSummary: "AI classification pending.",
        evidenceUrls: [],
      },
    })
    console.log(`  ✓  Case: ${data.disputeType} — ₹${data.amount ?? "N/A"} [${data.status}]`)
  }

  console.log("\n✅ Seed complete!")
  console.log("─────────────────────────────────────────")
  console.log("  Demo logins (password: Test@1234)")
  console.log("  user@demo.com      → complainant view")
  console.log("  bank@demo.com      → bank officer view")
  console.log("  juror@demo.com     → juror review view")
  console.log("  admin@demo.com     → admin dashboard")
  console.log("─────────────────────────────────────────\n")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
