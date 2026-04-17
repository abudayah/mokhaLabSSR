import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "The mokhaLab Blog — Coffee Culture & Craft Espresso Stories"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.mokhalab.ca/images/hero.jpg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.45,
          }}
        />

        {/* Warm dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(10,6,2,0.75) 0%, rgba(40,20,5,0.4) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "64px 72px",
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "rgba(255,200,120,0.8)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            mokhaLab — The Blog
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: 20,
            }}
          >
            Stories About
            <br />
            Coffee Culture.
          </div>

          {/* CTA */}
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.4,
            }}
          >
            Brewing rituals, craft tools & the art of the perfect shot →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
