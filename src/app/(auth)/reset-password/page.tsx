"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2 } from "lucide-react"

const requestSchema = z.object({ email: z.string().email("Enter a valid email") })
const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^a-zA-Z0-9]/),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: "Passwords do not match", path: ["confirm"] })

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const token = params.get("token")
  const uid = params.get("uid")

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Request form ──────────────────────────────────────
  const requestForm = useForm({ resolver: zodResolver(requestSchema), defaultValues: { email: "" } })

  const onRequest = async (data: { email: string }) => {
    setError(null)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); return }
    setSuccess(true)
  }

  // ── Reset form (token present in URL) ─────────────────
  const resetForm = useForm({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: "", confirm: "" } })

  const onReset = async (data: { newPassword: string; confirm: string }) => {
    setError(null)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: data.newPassword }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); return }
    setSuccess(true)
  }

  if (success && !token) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-gray-500">If an account exists, a reset link has been sent.</p>
          <Link href="/login" className="text-blue-600 hover:underline text-sm">Back to login</Link>
        </CardContent>
      </Card>
    )
  }

  if (success && token) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Password reset!</h2>
          <p className="text-gray-500">You can now sign in with your new password.</p>
          <Link href="/login" className="text-blue-600 hover:underline text-sm font-medium">Go to login</Link>
        </CardContent>
      </Card>
    )
  }

  // Show reset form if token is in URL, otherwise show request form
  return (
    <Card>
      <CardHeader>
        <CardTitle>{token ? "Set new password" : "Reset your password"}</CardTitle>
        <CardDescription>
          {token ? "Choose a strong password for your account." : "Enter your email and we'll send a reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

        {!token ? (
          <form onSubmit={requestForm.handleSubmit(onRequest)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...requestForm.register("email")} />
              {requestForm.formState.errors.email && (
                <p className="text-sm text-red-500">{requestForm.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
              {requestForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
            <p className="text-center text-sm">
              <Link href="/login" className="text-blue-600 hover:underline">Back to login</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" {...resetForm.register("newPassword")} />
              {resetForm.formState.errors.newPassword && (
                <p className="text-sm text-red-500">{resetForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" {...resetForm.register("confirm")} />
              {resetForm.formState.errors.confirm && (
                <p className="text-sm text-red-500">{resetForm.formState.errors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting}>
              {resetForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
