"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheck, Clock, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"]

interface Metrics {
  summary: {
    total: number
    resolved: number
    resolutionRate: number
    avgResolutionDays: number
    slaBreached: number
  }
  byType:         Array<{ name: string; value: number }>
  bySeverity:     Array<{ name: string; value: number }>
  byStatus:       Array<{ name: string; value: number }>
  authorityScores: Array<{ authority: string; total: number; resolved: number; breached: number; score: number }>
  dailyVolume:    Array<{ date: string; count: number }>
}

export default function PublicDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/metrics")
      .then(r => r.json())
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            DisputeResolve
          </Link>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Public transparency dashboard</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Platform transparency</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time metrics on dispute resolution performance. All data is backed by a tamper-evident audit chain.
          </p>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            [
              { label: "Total cases",       value: metrics?.summary.total ?? 0,                   icon: TrendingUp,   color: "text-blue-600"  },
              { label: "Resolution rate",   value: `${metrics?.summary.resolutionRate ?? 0}%`,    icon: CheckCircle2, color: "text-green-600" },
              { label: "Avg resolution",    value: `${metrics?.summary.avgResolutionDays ?? 0}d`, icon: Clock,        color: "text-purple-600"},
              { label: "SLA breaches",      value: metrics?.summary.slaBreached ?? 0,             icon: AlertCircle,  color: "text-red-600"   },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </div>
                <p className={`text-3xl font-semibold mt-2 ${color}`}>{value}</p>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Dispute types */}
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Cases by dispute type</p>
            {loading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metrics?.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {metrics?.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Severity */}
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Cases by severity</p>
            {loading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics?.bySeverity} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Cases" radius={[4,4,0,0]}>
                    {metrics?.bySeverity.map((s, i) => (
                      <Cell key={i} fill={s.name === "HIGH" ? "#ef4444" : s.name === "MEDIUM" ? "#f59e0b" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily volume */}
          <div className="bg-white rounded-xl border p-5 sm:col-span-2">
            <p className="text-sm font-semibold text-gray-900 mb-4">Cases filed — last 30 days</p>
            {loading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics?.dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Cases" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Authority effectiveness table */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Department effectiveness</p>
          <p className="text-xs text-gray-400 mb-4">
            Score = (resolved/total × 60%) + ((1 − sla_breaches/total) × 40%)
          </p>
          {loading ? <Skeleton className="h-32" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b">
                    <th className="pb-2 font-medium">Authority</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Resolved</th>
                    <th className="pb-2 font-medium text-right">SLA breaches</th>
                    <th className="pb-2 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.authorityScores.sort((a, b) => b.score - a.score).map(a => (
                    <tr key={a.authority} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-700">{a.authority}</td>
                      <td className="py-3 text-right text-gray-500">{a.total}</td>
                      <td className="py-3 text-right text-green-600">{a.resolved}</td>
                      <td className="py-3 text-right text-red-500">{a.breached}</td>
                      <td className="py-3 text-right">
                        <span className={`font-semibold ${a.score >= 70 ? "text-green-600" : a.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                          {a.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
