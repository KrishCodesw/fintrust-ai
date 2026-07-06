"use client"

// This page handles the case where a user navigates directly
// to /verify-email (e.g. after refreshing the registration page)
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-blue-600" />
          <CardTitle>Check your inbox</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          We sent a 6-digit verification code to your email address. Enter it on the
          registration page to complete your account setup.
        </p>
        <p className="text-sm text-gray-400">The code expires in 15 minutes.</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/register">Back to registration</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
