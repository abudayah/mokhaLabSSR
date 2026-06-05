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
