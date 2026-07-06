import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 5 login attempts per 15 minutes per IP
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15m"),
  prefix: "rl:login",
})

// 3 password reset emails per hour per IP
export const resetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1h"),
  prefix: "rl:reset",
})

// 30 token refreshes per hour per user (background silent refreshes)
export const refreshLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1h"),
  prefix: "rl:refresh",
})

// 20 AI requests per hour per user
export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1h"),
  prefix: "rl:ai",
})

// 50 fraud link checks per hour per user
export const fraudLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1h"),
  prefix: "rl:fraud",
})

export type LimitResult = { success: boolean; limit: number; remaining: number; reset: number }
