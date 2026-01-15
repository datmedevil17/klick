import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = Redis.fromEnv()

// Cookie-based rate limiter: 10 requests per 10 seconds
export const cookieRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:cookie",
  analytics: true,
})

// IP-based rate limiter: 50 requests per 10 seconds
export const ipRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 d"),
  prefix: "ratelimit:ip",
  analytics: true,
})
