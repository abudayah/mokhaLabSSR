// Global type declarations for Google Tag Manager / Consent Mode

interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataLayer: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtag?: (...args: any[]) => void
}
