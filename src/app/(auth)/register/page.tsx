"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/types/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error); return }
    setUserId(json.userId)
  }

  const verifyOtp = async () => {
    if (!userId) return
    setOtpError(null)
    setVerifying(true)
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, otp }),
    })
    const json = await res.json()
    setVerifying(false)
    if (!res.ok) { setOtpError(json.error); return }
    setDone(true)
    setTimeout(() => router.push("/login"), 2000)
  }

  // ── Step 3: success ───────────────────────────────────
  if (done) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Email verified!</h2>
          <p className="text-gray-500">Redirecting you to login…</p>
        </CardContent>
      </Card>
    )
  }

  // ── Step 2: OTP verification ──────────────────────────
  if (userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {form.getValues("email")}. It expires in 15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {otpError && <Alert variant="destructive"><AlertDescription>{otpError}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <Button className="w-full" onClick={verifyOtp} disabled={otp.length !== 6 || verifying}>
            {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : "Verify code"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Step 1: Registration form ─────────────────────────
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg">FinTrust-AI</span>
        </div>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>File and track digital payment disputes</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
            )}
            <p className="text-xs text-gray-400">
              Min. 8 chars · one uppercase · one number · one special character
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</>
              : "Create account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="text-sm text-gray-500 text-center w-full">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
