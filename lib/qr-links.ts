export interface QrLink {
  id: string
  code: string
  destinationUrl: string
  label?: string
  createdAt: string
  clickCount: number
  lastClickedAt?: string
}

export interface ClickEvent {
  id: string
  qrLinkId: string
  clickedAt: string
  userAgent?: string
  ip?: string
  referer?: string
  createdAt: string
}

export type DeviceType = "mobile" | "tablet" | "desktop"

export interface DerivedClickData {
  deviceType: DeviceType
  country?: string
  region?: string
}

/** Daily aggregated metrics for a QR link. Mirrors the ClickMetricSummary DynamoDB model. */
export interface ClickMetricSummary {
  id: string
  qrLinkId: string
  dateKey: string           // "YYYY-MM-DD"
  totalClicks: number
  uniqueIps: number
  likelyScanClicks: number  // mobile + no referer
  botClicks: number
  mobileClicks: number
  tabletClicks: number
  desktopClicks: number
  unknownClicks: number
  /** JSON: Array<{ name: string; count: number }> */
  topOS?: string | null
  /** JSON: Array<{ name: string; count: number }> */
  topBrowsers?: string | null
  /** JSON: Array<{ name: string; count: number }> */
  topSources?: string | null
  /** JSON: Array<{ name: string; count: number }> */
  topCountries?: string | null
  /** JSON: Record<"00"-"23", number> */
  hourDistribution?: string | null
}

/** Parsed counter item from topOS / topBrowsers / topSources / topCountries JSON */
export interface MetricCounterItem {
  name: string
  count: number
}

/** Parses a JSON counter string from ClickMetricSummary into a typed array */
export function parseMetricCounter(json: string | null | undefined): MetricCounterItem[] {
  if (!json) return []
  try {
    return JSON.parse(json) as MetricCounterItem[]
  } catch {
    return []
  }
}

/** Parses the hourDistribution JSON into an ordered array for charting */
export function parseHourDistribution(json: string | null | undefined): Array<{ hour: string; clicks: number }> {
  if (!json) return []
  try {
    const dist = JSON.parse(json) as Record<string, number>
    return Array.from({ length: 24 }, (_, i) => {
      const hour = String(i).padStart(2, "0")
      return { hour, clicks: dist[hour] ?? 0 }
    })
  } catch {
    return []
  }
}
