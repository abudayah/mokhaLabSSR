/**
 * Generates static OG images for every product.
 *
 * For each product it:
 *   1. Loads the main product image from public/
 *   2. Resizes it to fit within a 1080×1080 area (preserving aspect ratio)
 *   3. Composites it centred on a 1200×630 white canvas
 *   4. Writes the result to public/images/<product-id>/og.png
 *
 * Usage:
 *   node scripts/generate-og-images.mjs
 */

import sharp from "sharp"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, "../public")

// Respect the same env var used by the Next.js app
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mokhalab.com").replace(/\/$/, "")

// ── Inline product image map (mirrors lib/products.ts) ──────────────────────
// Keeping this separate avoids needing ts-node / tsx just for a build script.
const productImages = [
  { id: "ML-PIT-BLK-53-01", image: "/images/ML-PIT-BLK-53-01/602835779023.main.webp" },
  { id: "ML-PIT-BLK-58-01", image: "/images/ML-PIT-BLK-58-01/602835779023.main.webp" },
  { id: "ML-FWDT-BLK-01",   image: "/images/ML-FWDT-BLK-01/602835779061.main.webp"   },
  { id: "ML-GAD-BLK-58-01", image: "/images/ML-GAD-BLK-58-01/602835779047.main.webp" },
  { id: "ML-WTS-WLN-01",    image: "/images/ML-WTS-WLN-01/602835779054.main.webp"    },
  { id: "ML-WBT-2PK-01",    image: "/images/ML-WBT-2PK-01/602835779078.main.webp"    },
]

const OG_WIDTH  = 1200
const OG_HEIGHT = 630
// Max size the product image may occupy inside the canvas
const MAX_IMG   = 500

async function generateOg({ id, image }) {
  const srcPath = path.join(publicDir, image)
  const outPath = path.join(publicDir, path.dirname(image), "og.png")

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠  Source not found, skipping: ${srcPath}`)
    return
  }

  // Resize the product image to fit within MAX_IMG × MAX_IMG, keeping aspect ratio
  // Convert to PNG buffer so sharp can composite it without needing raw pixel info
  const resizedBuf = await sharp(srcPath)
    .resize(MAX_IMG, MAX_IMG, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()

  // Read back the dimensions from the resized PNG
  const { width, height } = await sharp(resizedBuf).metadata()

  // Centre the image on the white canvas
  const left = Math.round((OG_WIDTH  - width)  / 2)
  const top  = Math.round((OG_HEIGHT - height) / 2)

  await sharp({
    create: {
      width:      OG_WIDTH,
      height:     OG_HEIGHT,
      channels:   4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resizedBuf, left, top }])
    .png()
    .toFile(outPath)

  console.log(`✓  ${id}  →  ${path.relative(publicDir, outPath)}`)
}

// Run all in parallel
await Promise.all(productImages.map(generateOg))
console.log("Done.")
