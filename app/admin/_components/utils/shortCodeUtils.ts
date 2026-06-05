const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const MIN_LEN = 4
const MAX_LEN = 6
const MAX_ATTEMPTS = 10

export function generateShortCode(): string {
  const len = MIN_LEN + Math.floor(Math.random() * (MAX_LEN - MIN_LEN + 1))
  return Array.from({ length: len }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join("")
}

export function validateShortCode(code: string): boolean {
  return /^[A-Za-z0-9]{4,6}$/.test(code)
}

export async function generateUniqueCode(
  existingCodes: Set<string>
): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = generateShortCode()
    if (!existingCodes.has(code.toUpperCase())) return code
  }
  throw new Error("Failed to generate a unique short code after 10 attempts.")
}
