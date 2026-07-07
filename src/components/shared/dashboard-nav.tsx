"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Users,
  Gavel,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function DashboardNav() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const userLinks = [
    { href: "/user/my-cases",     label: "My Cases",    icon: FolderOpen },
    { href: "/user/new-complaint",label: "File Dispute", icon: FileText },
    { href: "/user/settings",     label: "Settings",    icon: Settings },
  ]

  const officerLinks = [
    { href: "/officer", label: "Assigned Cases", icon: LayoutDashboard },
  ]

  const jurorLinks = [
    { href: "/juror", label: "Review Queue", icon: Gavel },
  ]

  const adminLinks = [
    { href: "/admin",       label: "Admin",  icon: LayoutDashboard },
    { href: "/admin/users", label: "Users",  icon: Users },
  ]

  const isOfficer = ["OFFICER_BANK","OFFICER_NPCI","OMBUDSMAN","CYBERCRIME"].includes(user?.role ?? "")

  const links =
    user?.role === "ADMIN"   ? [...userLinks, ...adminLinks] :
    user?.role === "JUROR"   ? jurorLinks :
    isOfficer                ? officerLinks :
    userLinks

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            DisputeResolve
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            <Link
              href="/public-dashboard"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === "/public-dashboard"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
