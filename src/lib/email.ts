import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "DisputeResolve <noreply@disputeresolve.in>"

export async function sendVerificationEmail(email: string, otp: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email — DisputeResolve",
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 15 minutes.</p>`,
  })
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your password — DisputeResolve",
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  })
}

export async function sendSuspiciousLoginAlert(email: string, ip: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "New sign-in detected — DisputeResolve",
    html: `<p>We noticed a sign-in to your account from a new location (IP: ${ip}).</p><p>If this was you, no action needed. If not, please reset your password immediately.</p>`,
  })
}

export async function sendSlaBreachAlert(email: string, caseId: string, authority: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `SLA breach — Case ${caseId}`,
    html: `<p>Case <strong>${caseId}</strong> has exceeded the response deadline assigned to <strong>${authority}</strong>.</p><p>This case has been flagged for escalation.</p>`,
  })
}

export async function sendCaseUpdateEmail(email: string, caseId: string, status: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Case ${caseId} updated — ${status}`,
    html: `<p>Your case <strong>${caseId}</strong> status has been updated to <strong>${status}</strong>.</p>`,
  })
}
