import QRCode from "qrcode"

export async function generateQrSvg(code: string): Promise<string> {
  const url = `https://www.mokhalab.com/go/${code}`
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M" })
}

export async function generateQrPngDataUrl(code: string): Promise<string> {
  const url = `https://www.mokhalab.com/go/${code}`
  return QRCode.toDataURL(url, {
    type: "image/png",
    errorCorrectionLevel: "M",
    width: 512,
    margin: 2,
  })
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

export function downloadQrPng(dataUrl: string, code: string): void {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = `qr-${code}.png`
  a.click()
}
