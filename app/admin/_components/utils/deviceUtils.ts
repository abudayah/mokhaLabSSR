import type { DeviceType } from "@/lib/qr-links"

export function parseDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet"
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) return "mobile"
  return "desktop"
}
