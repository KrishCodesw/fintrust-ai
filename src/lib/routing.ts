import { DisputeType, Severity, Authority } from "@prisma/client"

// SLA in calendar days per authority
export const SLA_DAYS: Record<Authority, number> = {
  BANK: 7,
  NPCI: 30,
  RBI_OMBUDSMAN: 30,
  CYBERCRIME: 14,
  CONSUMER_FORUM: 45,
}

type RoutingRule = {
  authority: Authority
}

const ROUTING_TABLE: Record<DisputeType, Record<Severity, RoutingRule>> = {
  FAILED_TXN: {
    LOW:    { authority: "BANK" },
    MEDIUM: { authority: "BANK" },
    HIGH:   { authority: "NPCI" },
  },
  UNAUTHORIZED_PAYMENT: {
    LOW:    { authority: "BANK" },
    MEDIUM: { authority: "BANK" },
    HIGH:   { authority: "CYBERCRIME" },
  },
  REFUND_DELAY: {
    LOW:    { authority: "BANK" },
    MEDIUM: { authority: "NPCI" },
    HIGH:   { authority: "RBI_OMBUDSMAN" },
  },
  MERCHANT_SCAM: {
    LOW:    { authority: "BANK" },
    MEDIUM: { authority: "CONSUMER_FORUM" },
    HIGH:   { authority: "CYBERCRIME" },
  },
  PHISHING: {
    LOW:    { authority: "CYBERCRIME" },
    MEDIUM: { authority: "CYBERCRIME" },
    HIGH:   { authority: "CYBERCRIME" },
  },
}

export function routeCase(disputeType: DisputeType, severity: Severity): {
  authority: Authority
  slaDeadline: Date
} {
  const rule = ROUTING_TABLE[disputeType][severity]
  const slaDeadline = new Date()
  slaDeadline.setDate(slaDeadline.getDate() + SLA_DAYS[rule.authority])
  return { authority: rule.authority, slaDeadline }
}
