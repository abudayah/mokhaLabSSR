import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url) {
    return NextResponse.json({ title: null }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; mokhaLab-bot/1.0)" },
    })
    if (!res.ok) return NextResponse.json({ title: null })

    const html = await res.text()
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = match ? match[1].trim() : null
    return NextResponse.json({ title })
  } catch {
    return NextResponse.json({ title: null })
  }
}
