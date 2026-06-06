const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
const CHARSET_SIZE = CHARSET.length // 62

const MIN_LEN = 3
const MAX_LEN = 120
const START_LEN = 3      // default generation length
const MAX_ATTEMPTS = 50  // attempts per length before incrementing length

export function generateShortCode(length = START_LEN): string {
  const len = Math.max(MIN_LEN, Math.min(length, MAX_LEN))
  return Array.from({ length: len }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET_SIZE)]
  ).join("")
}

export function validateShortCode(code: string): boolean {
  return /^[A-Za-z0-9]{3,120}$/.test(code)
}

/**
 * Generates a unique code not present in `existingCodes`.
 * Starts at length 3 and increments length when the current length
 * space is exhausted (after MAX_ATTEMPTS failures at a given length).
 */
export async function generateUniqueCode(
  existingCodes: Set<string>
): Promise<string> {
  for (let len = START_LEN; len <= MAX_LEN; len++) {
    // Total possible codes at this length = 62^len
    // If all slots at this length are taken, move to next length
    const possible = Math.pow(CHARSET_SIZE, len)
    const attemptsAtLen = Math.min(MAX_ATTEMPTS, possible)

    for (let attempt = 0; attempt < attemptsAtLen; attempt++) {
      const code = generateShortCode(len)
      if (!existingCodes.has(code)) return code
    }
    // If we exhausted attempts at this length, try longer codes
  }
  throw new Error("Failed to generate a unique short code. All lengths exhausted.")
}
