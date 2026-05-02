/**
 * lib/rate-limit.ts
 *
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per IP address.
 *
 * Usage in API routes:
 *   import { rateLimit } from '@/lib/rate-limit'
 *
 *   export async function POST(req: NextRequest) {
 *     const limited = rateLimit(req, { maxRequests: 30, windowMs: 60_000 })
 *     if (limited) return limited
 *     // ... handle request
 *   }
 */

import { NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const keys = Array.from(store.keys())
  for (const key of keys) {
    const entry = store.get(key)
    if (entry && now > entry.resetAt) store.delete(key)
  }
}, 300_000).unref?.()

interface RateLimitOptions {
  /** Max requests allowed in the window (default: 60) */
  maxRequests?: number
  /** Window duration in ms (default: 60_000 = 1 minute) */
  windowMs?: number
  /** Custom key extractor (defaults to IP address) */
  keyFn?: (req: Request) => string
}

/**
 * Check rate limit for a request.
 * Returns null if allowed, or a 429 NextResponse if rate-limited.
 */
export function rateLimit(
  req: Request,
  options: RateLimitOptions = {}
): NextResponse | null {
  const {
    maxRequests = 60,
    windowMs = 60_000,
    keyFn,
  } = options

  const key = keyFn
    ? keyFn(req)
    : getClientIp(req) || 'unknown'

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests. Please slow down.',
        retryAfterSeconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(entry.resetAt),
        },
      }
    )
  }

  return null
}

function getClientIp(req: Request): string {
  // Next.js / Vercel forwarding headers
  const forwarded = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
  if (forwarded) return forwarded

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp

  return '127.0.0.1'
}
