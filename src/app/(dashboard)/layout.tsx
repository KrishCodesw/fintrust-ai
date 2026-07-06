import { ReactNode } from "react"
import { DashboardNav } from "@/components/shared/dashboard-nav"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
