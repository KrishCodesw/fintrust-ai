import { PrismaClient } from "@prisma/client"
import { hash } from "argon2"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const password = await hash("Test@1234", { memoryCost: 65536, timeCost: 3, parallelism: 4 })

  // Create one user of every role for demo
  const roles = [
    { email: "user@demo.com",     role: "USER"         },
    { email: "bank@demo.com",     role: "OFFICER_BANK" },
    { email: "npci@demo.com",     role: "OFFICER_NPCI" },
    { email: "ombudsman@demo.com",role: "OMBUDSMAN"    },
    { email: "cyber@demo.com",    role: "CYBERCRIME"   },
    { email: "juror@demo.com",    role: "JUROR"        },
    { email: "admin@demo.com",    role: "ADMIN"        },
    { email: "auditor@demo.com",  role: "AUDITOR"      },
  ] as const

  const users: Record<string, { id: string }> = {}

  for (const { email, role } of roles) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: password, role, emailVerified: true },
    })
    users[role] = user
    console.log(`  ✓ ${role}: ${email} / Test@1234`)
  }

  // Seed a few demo cases
  const caseData = [
    {
      disputeType: "FAILED_TXN" as const,
      severity: "MEDIUM" as const,
      status: "UNDER_REVIEW" as const,
      assignedTo: "BANK" as const,
      description: "I made a UPI payment of ₹5000 to my friend but the amount was debited from my account and the transaction shows failed. The amount has not been refunded for 5 days.",
      amount: 5000,
      transactionId: "UPI202401150001",
    },
    {
      disputeType: "PHISHING" as const,
      severity: "HIGH" as const,
      status: "JUROR_REVIEW" as const,
      assignedTo: "CYBERCRIME" as const,
      description: "I received a call from someone claiming to be from my bank. They asked me to install an app and share OTP. ₹45000 was debited from my account immediately after.",
      amount: 45000,
    },
    {
      disputeType: "REFUND_DELAY" as const,
      severity: "LOW" as const,
      status: "FILED" as const,
      assignedTo: "BANK" as const,
      description: "I returned a product to an online merchant 3 weeks ago. They confirmed the refund but it has not appeared in my bank account.",
      amount: 2499,
    },
  ]

  for (const data of caseData) {
    await prisma.case.create({
      data: {
        userId: users["USER"].id,
        ...data,
        slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        aiSummary: "AI-generated summary will appear here after processing.",
      },
    })
  }

  console.log("\n✓ Seed complete")
  console.log("  Demo login: any email above, password: Test@1234")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
