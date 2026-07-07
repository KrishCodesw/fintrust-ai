"use client"

import Link from "next/link"
import { Users, LayoutDashboard, ShieldCheck, FileText } from "lucide-react"

const cards = [
  {
    title: "User management",
    desc:  "Promote users to officers, jurors, or admins. Unlock locked accounts.",
    href:  "/admin/users",
    icon:  Users,
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "All cases",
    desc:  "View and manage every case on the platform regardless of authority.",
    href:  "/officer",
    icon:  FileText,
    color: "text-purple-600 bg-purple-50",
  },
  {
    title: "Public dashboard",
    desc:  "View the public transparency dashboard — resolution rates and metrics.",
    href:  "/public-dashboard",
    icon:  LayoutDashboard,
    color: "text-green-600 bg-green-50",
  },
  {
    title: "Audit verification",
    desc:  "Verify the integrity of any case's audit chain by entering a case ID.",
    href:  "/audit",
    icon:  ShieldCheck,
    color: "text-orange-600 bg-orange-50",
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin panel</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform management and oversight</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(({ title, desc, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all flex gap-4 items-start"
          >
            <div className={`p-2.5 rounded-lg flex-shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{title}</p>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
