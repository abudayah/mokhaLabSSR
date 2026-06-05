import type { ClickEvent } from "@/lib/qr-links"

interface GeoResult {
  country: string | null
  region: string | null
}

export async function fetchGeoLocation(ip: string): Promise<GeoResult> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return { country: null, region: null }
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { country: null, region: null }
    const data = await res.json()
    return {
      country: typeof data.country === "string" ? data.country : null,
      region: typeof data.regionName === "string" ? data.regionName : null,
    }
  } catch {
    return { country: null, region: null }
  }
}

export async function resolveGeoForEvents(
  events: ClickEvent[]
): Promise<Map<string, GeoResult>> {
  const uniqueIps = Array.from(new Set(events.map((e) => e.ip).filter((ip): ip is string => Boolean(ip))))
  const results = await Promise.all(uniqueIps.map((ip) => fetchGeoLocation(ip)))
  return new Map(uniqueIps.map((ip, i) => [ip, results[i]]))
}
