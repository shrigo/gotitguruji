// Simple in-memory rate limiter for MVP
// In production, use Redis or a database

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const DAILY_LIMIT = 10;

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  // Reset if new day
  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + 24 * 60 * 60 * 1000, // 24 hours from now
    });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (entry.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: DAILY_LIMIT - entry.count };
}
