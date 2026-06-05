import type { ClickEvent, DeviceType } from "@/lib/qr-links"
import { parseDeviceType } from "./deviceUtils"

/**
 * Groups click events into a trailing `days`-day window (default 30).
 * Dates are in YYYY-MM-DD format. Missing days are zero-filled.
 */
export function groupClicksByDay(
  events: ClickEvent[],
  days: number = 30
): Array<{ date: string; count: number }> {
  // Build the trailing window of dates (oldest → newest)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dateLabels: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dateLabels.push(d.toISOString().slice(0, 10))
  }

  // Count events per day
  const counts = new Map<string, number>()
  for (const label of dateLabels) {
    counts.set(label, 0)
  }

  const windowStart = dateLabels[0]
  const windowEnd = dateLabels[dateLabels.length - 1]

  for (const event of events) {
    const date = event.clickedAt.slice(0, 10)
    if (date >= windowStart && date <= windowEnd) {
      counts.set(date, (counts.get(date) ?? 0) + 1)
    }
  }

  return dateLabels.map((date) => ({ date, count: counts.get(date) ?? 0 }))
}

/**
 * Groups click events by device type.
 * Always returns entries for all three device types (mobile, tablet, desktop).
 */
export function groupByDeviceType(
  events: ClickEvent[]
): Array<{ type: DeviceType; count: number }> {
  const counts: Record<DeviceType, number> = {
    mobile: 0,
    tablet: 0,
    desktop: 0,
  }

  for (const event of events) {
    const deviceType = parseDeviceType(event.userAgent ?? "")
    counts[deviceType] += 1
  }

  return [
    { type: "mobile", count: counts.mobile },
    { type: "tablet", count: counts.tablet },
    { type: "desktop", count: counts.desktop },
  ]
}

/**
 * Returns the top `limit` countries (default 10) by click count.
 * Filters out null countries; sorts descending by count.
 */
export function topCountries(
  geoResults: Array<{ country: string | null }>,
  limit: number = 10
): Array<{ country: string; count: number }> {
  const counts = new Map<string, number>()

  for (const result of geoResults) {
    if (result.country === null) continue
    counts.set(result.country, (counts.get(result.country) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
