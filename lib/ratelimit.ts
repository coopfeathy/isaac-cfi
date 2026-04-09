import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

let _ratelimit: Ratelimit | null = null

export function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Upstash env vars missing — rate limiting disabled')
    return null
  }
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'merlin_rl',
    })
  }
  return _ratelimit
}

export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const limiter = getRatelimit()
  if (!limiter) return null // fail open if not configured

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  try {
    const { success } = await limiter.limit(ip)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests — please try again later.' },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('Rate limit check failed:', err)
    // fail open — allow request if Redis is down
  }
  return null
}
