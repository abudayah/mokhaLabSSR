/**
 * lib/metrics-parser.ts
 *
 * Parses a User-Agent string and referer into structured metrics dimensions.
 * Used by the QR redirect route handler to compute real-time click analytics.
 *
 * Uses ua-parser-js for accurate UA parsing.
 */

import { UAParser } from "ua-parser-js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceCategory = "mobile" | "tablet" | "desktop" | "bot" | "unknown"

export interface ParsedClick {
  deviceCategory: DeviceCategory
  os: string           // "iOS", "Android", "Windows", "macOS", "Linux", "Unknown"
  browser: string      // "Chrome", "Safari", "Firefox", "Edge", "Samsung Browser", "Unknown"
  source: string       // "direct", "instagram.com", "facebook.com", "google.com", etc.
  isLikelyScan: boolean // mobile + no referer → physical QR scan
  isBot: boolean
}

// Known bot user agent patterns
const BOT_PATTERN =
  /bot|crawler|spider|scraper|curl|wget|python-requests|axios|node-fetch|go-http|java|libwww|scan|monitor|uptime|pingdom|gtmetrix|lighthouse|headless/i

// Source normalisation map — maps hostname segments to clean labels
const SOURCE_MAP: Record<string, string> = {
  "instagram.com": "Instagram",
  "l.instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "m.facebook.com": "Facebook",
  "t.co": "Twitter / X",
  "twitter.com": "Twitter / X",
  "x.com": "Twitter / X",
  "tiktok.com": "TikTok",
  "vm.tiktok.com": "TikTok",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "linkedin.com": "LinkedIn",
  "lnkd.in": "LinkedIn",
  "pinterest.com": "Pinterest",
  "snapchat.com": "Snapchat",
  "google.com": "Google",
  "google.ca": "Google",
  "bing.com": "Bing",
  "yahoo.com": "Yahoo",
  "duckduckgo.com": "DuckDuckGo",
  "mail.google.com": "Gmail",
  "outlook.live.com": "Outlook",
  "outlook.com": "Outlook",
  "yahoo.com/mail": "Yahoo Mail",
  "amazon.com": "Amazon",
  "amazon.ca": "Amazon",
  "mokhalab.com": "mokhaLab (internal)",
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseClick(userAgent: string | undefined, referer: string | undefined): ParsedClick {
  const ua = userAgent ?? ""

  // Bot detection first — short circuit
  if (BOT_PATTERN.test(ua)) {
    return {
      deviceCategory: "bot",
      os: "Bot",
      browser: "Bot",
      source: referer ? normaliseSource(referer) : "direct",
      isLikelyScan: false,
      isBot: true,
    }
  }

  const parser = new UAParser(ua)
  const device = parser.getDevice()
  const osResult = parser.getOS()
  const browserResult = parser.getBrowser()

  // Device category
  let deviceCategory: DeviceCategory
  const deviceType = device.type ?? ""
  if (deviceType === "mobile") deviceCategory = "mobile"
  else if (deviceType === "tablet") deviceCategory = "tablet"
  else if (!deviceType && ua) deviceCategory = "desktop"
  else deviceCategory = "unknown"

  // OS name
  const os = osResult.name ?? "Unknown"

  // Browser name — handle common in-app browsers
  let browser = browserResult.name ?? "Unknown"
  if (/Instagram/i.test(ua)) browser = "Instagram In-App"
  else if (/FBAV|FBIOS|FB_IAB/i.test(ua)) browser = "Facebook In-App"
  else if (/TikTok/i.test(ua)) browser = "TikTok In-App"

  // Source from referer
  const source = referer ? normaliseSource(referer) : "direct"

  // Likely physical QR scan: mobile device with no referer
  const isLikelyScan = deviceCategory === "mobile" && !referer

  return {
    deviceCategory,
    os,
    browser,
    source,
    isLikelyScan,
    isBot: false,
  }
}

// ---------------------------------------------------------------------------
// Source normaliser
// ---------------------------------------------------------------------------

function normaliseSource(referer: string): string {
  try {
    const url = new URL(referer)
    const hostname = url.hostname.replace(/^www\./, "")
    // Check exact match
    if (SOURCE_MAP[hostname]) return SOURCE_MAP[hostname]
    // Check partial match (e.g. subdomain.google.com)
    for (const [key, label] of Object.entries(SOURCE_MAP)) {
      if (hostname.endsWith(key)) return label
    }
    return hostname
  } catch {
    return "direct"
  }
}

// ---------------------------------------------------------------------------
// Summary merge helpers
// ---------------------------------------------------------------------------

/** Parses a JSON counter list, increments the key, returns updated JSON string. */
export function incrementJsonCounter(
  json: string | null | undefined,
  key: string,
  topN = 10
): string {
  let arr: Array<{ name: string; count: number }> = []
  try {
    arr = JSON.parse(json ?? "[]")
  } catch {
    arr = []
  }

  const existing = arr.find((e) => e.name === key)
  if (existing) {
    existing.count += 1
  } else {
    arr.push({ name: key, count: 1 })
  }

  // Keep top N by count
  arr.sort((a, b) => b.count - a.count)
  return JSON.stringify(arr.slice(0, topN))
}

/** Parses a JSON hour distribution object and increments the given hour. */
export function incrementHourDistribution(
  json: string | null | undefined,
  hour: string  // "00" - "23"
): string {
  let dist: Record<string, number> = {}
  try {
    dist = JSON.parse(json ?? "{}")
  } catch {
    dist = {}
  }
  dist[hour] = (dist[hour] ?? 0) + 1
  return JSON.stringify(dist)
}

/** Adds an IP to the seen-IPs string (comma-separated, capped at 500 chars). */
export function addSeenIp(seenIps: string | null | undefined, ip: string): { seen: boolean; updated: string } {
  const current = seenIps ?? ""
  const ips = current ? current.split(",") : []
  if (ips.includes(ip)) return { seen: true, updated: current }
  ips.push(ip)
  const updated = ips.join(",").slice(-500) // cap at ~500 chars (~40 IPs)
  return { seen: false, updated }
}
