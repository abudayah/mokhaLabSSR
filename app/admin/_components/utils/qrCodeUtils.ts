import QRCode from "qrcode"

export async function generateQrSvg(code: string): Promise<string> {
  const url = `https://www.mokhalab.com/go/${code}`
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M" })
}

export function downloadQrSvg(svgString: string, code: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qr-${code}.svg`
  a.click()
  URL.revokeObjectURL(url)
}
