import { z } from "zod"

export const createCaseSchema = z.object({
  transactionId: z.string().optional(),
  upiId: z.string().optional(),
  amount: z.number().positive().optional(),
  bankName: z.string().optional(),
  appUsed: z.string().optional(),
  description: z.string().min(20, "Please describe the issue in at least 20 characters"),
  evidenceUrls: z.array(z.string().url()).optional().default([]),
  fraudLink: z.string().url().optional().or(z.literal("")),
})

export const updateCaseSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "ESCALATED", "RESOLVED", "CLOSED"]).optional(),
  officerNote: z.string().optional(),
})

export const submitVerdictSchema = z.object({
  verdict: z.enum(["FAVOUR_USER", "FAVOUR_AUTHORITY", "INCONCLUSIVE"]),
  reasoning: z.string().min(10, "Please provide your reasoning"),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
