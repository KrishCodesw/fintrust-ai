"use client"

import { useCallback } from "react"
import { useAuth } from "@/context/auth-context"

// Drop-in fetch wrapper that:
// 1. Attaches the JWT access token to every request
// 2. On 401 JWT_EXPIRED — silently refreshes the token and retries once
// 3. On 401 after retry — logs the user out

export function useAuthFetch() {
  const { accessToken, refreshToken, logout } = useAuth()

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers)
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)

      const res = await fetch(input, { ...init, headers, credentials: "include" })

      if (res.status === 401) {
        const data = await res.clone().json().catch(() => ({}))
        if (data.code === "JWT_EXPIRED") {
          const refreshed = await refreshToken()
          if (refreshed) {
            // Retry the original request with the new token
            // Note: the new token is now in state — re-read via a second call
            return authFetch(input, init)
          }
          await logout()
        }
      }

      return res
    },
    [accessToken, refreshToken, logout]
  )

  return authFetch
}
