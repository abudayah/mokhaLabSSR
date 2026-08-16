/**
 * scripts/migrate-products.ts
 *
 * One-time migration script — seeds DynamoDB with all products that were
 * previously defined in lib/products.ts (now removed).
 *
 * Run with:
 *   npx tsx scripts/migrate-products.ts
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 10.9
 *
 * Prerequisites:
 *   - Valid Cognito credentials in the environment (run after `npx ampx sandbox`
 *     is active or against the deployed backend with appropriate credentials)
 *   - amplify_outputs.json present at the project root
 */

import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import outputs from "@/amplify_outputs.json"
import type { Schema } from "@/amplify/data/resource"

// ---------------------------------------------------------------------------
// Inlined product data (previously in lib/products.ts)
// ---------------------------------------------------------------------------

interface StaticProduct {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  prices: { USD: number; CAD: number }
  image: string
  images: string[]
  amazonUrl?: string
  amazonUrls?: { us?: string; ca?: string }
  features: { icon: string; title: string; description: string }[]
  specs: { label: string; value: string }[]
  compatibleMachines: string[]
  youtubeId: string
  relatedIds: string[]
  variantIds?: string[]
  rating?: number
  ratingCount?: number
}

const machines53and54 = [
  "La Spaziale LUCCA A53 Mini",
  "La Spaziale Vivaldi II",
  "La Spaziale Mini Vivaldi II",
  "La Spaziale S1 Dream",
  "Breville Bambino",
  "Breville Bambino Plus",
  "Breville Barista Express",
  "Breville Barista Pro",
  "Breville Barista Touch",
  "Breville Infuser",
  "Breville Duo Temp Pro",
  "Solis Barista Perfetta Plus",
]

const machines58 = [
  "Gaggia Classic Pro",
  "Rancilio Silvia",
  "Breville Dual Boiler",
  "Profitec Go",
  "Lelit Bianca V3",
  "Lelit Mara X",
  "Rocket Appartamento",
  "La Marzocco Linea Micra",
  "La Marzocco Linea Mini",
  "ECM Synchronika",
  "Decent Espresso DE1",
  "Turin Legato",
]

const products: StaticProduct[] = [
  {
    id: "ML-K200",
    slug: "mini-coffee-scale",
    name: "Mini Coffee Scale",
    tagline: "Measure. Time. Repeat. Perfectly.",
    description:
      "Every detail of the mokhaLab Mini Coffee Scale is designed to bring greater precision and control to your daily brewing. Weigh coffee and water to 0.1g accuracy while the built-in timer tracks your extraction simultaneously — helping you dial in espresso and refine pour-over recipes with confidence. The compact footprint fits naturally into any setup, and USB-C charging keeps it ready without disposable batteries.",
    prices: { USD: 0, CAD: 0 },
    image: "/images/ML-K200/main.webp",
    images: [
      "/images/ML-K200/main.webp",
      "/images/ML-K200/03.webp",
      "/images/ML-K200/04.webp",
      "/images/ML-K200/02.webp",
      "/images/ML-K200/05.webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0H8KZS3L8",
      ca: "https://www.amazon.ca/dp/B0H8KZS3L8",
    },
    features: [
      { icon: "zap", title: "0.1g Precision", description: "Measures in precise 0.1g increments to help you dial in espresso shots and maintain consistent pour-over recipes." },
      { icon: "circle", title: "Built-In Brew Timer", description: "Track brew time and weight simultaneously to better understand and control your extraction." },
      { icon: "layers", title: "USB-C Rechargeable", description: "Convenient USB-C charging means no disposable batteries required — always ready for your next brew." },
      { icon: "check", title: "Compact & Versatile", description: "Mini footprint suits espresso, pour over, French press, and more brewing methods." },
    ],
    specs: [
      { label: "Model", value: "ML-K200" },
      { label: "Capacity", value: "2kg" },
      { label: "Precision", value: "0.1g" },
      { label: "Display", value: "LED" },
      { label: "Charging", value: "USB-C" },
      { label: "Color", value: "Black" },
      { label: "Dimensions", value: "16.26 x 14.48 x 6.35 cm" },
      { label: "Weight", value: "300g" },
      { label: "UPC", value: "602835779115" },
    ],
    compatibleMachines: ["Universal — suits espresso, pour over, French press, and more"],
    youtubeId: "",
    relatedIds: ["ML-FWDT-BLK-01", "ML-WTS-WLN-01", "ML-GAD-BLK-58-01"],
  },
  {
    id: "ML-PIT-BLK-53-01",
    slug: "precision-impact-tamper-53mm",
    name: "Precision Impact Tamper – 53mm",
    tagline: "30lb. Self-leveling. Every time.",
    description:
      "Achieve professional-level consistency with the mokhaLab Spring-Loaded Calibrated Tamper. The self-leveling design sits flush against your portafilter for a perfectly flat puck every time. The internal 30lb constant-pressure mechanism delivers a tactile impact feel that guarantees repeatable results regardless of technique — paired with an ergonomic natural wooden handle.",
    prices: { USD: 49.95, CAD: 59.95 },
    image: "/images/ML-PIT-BLK-53-01/main.webp",
    images: [
      "/images/ML-PIT-BLK-53-01/main.webp",
      "/images/ML-PIT-BLK-53-01/02.webp",
      "/images/ML-PIT-BLK-53-01/03.webp",
      "/images/ML-PIT-BLK-53-01/04.webp",
      "/images/ML-PIT-BLK-53-01/05.webp",
      "/images/ML-PIT-BLK-53-01/06.webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GVW4DT9Y",
      ca: "https://www.amazon.ca/dp/B0GVW4DT9Y",
    },
    features: [
      { icon: "zap", title: "30lb Calibrated Pressure", description: "Constant spring-loaded mechanism ensures consistent 30lb compression every brew." },
      { icon: "check", title: "Self-Leveling Design", description: "Leveling plate sits flush against the portafilter rim — no tilted tamps, no channeling." },
      { icon: "layers", title: "Wood & Steel Construction", description: "Food-safe stainless steel base with an ergonomic natural wooden handle." },
      { icon: "circle", title: "Tactile Impact Feedback", description: "Internal spring gives a distinct impact feel when required pressure is reached." },
    ],
    specs: [
      { label: "Model", value: "ML-PIT-BLK-53-01" },
      { label: "Size", value: "53mm" },
      { label: "Spring Pressure", value: "30lb" },
      { label: "Material", value: "Aluminum, Stainless Steel, Wood" },
      { label: "Color", value: "Black" },
      { label: "UPC", value: "602835779030" },
    ],
    compatibleMachines: machines53and54,
    youtubeId: "",
    relatedIds: ["ML-FWDT-BLK-01", "ML-GAD-BLK-58-01"],
    variantIds: ["ML-PIT-BLK-53-01", "ML-PIT-BLK-58-01"],
  },
  {
    id: "ML-PIT-BLK-58-01",
    slug: "precision-impact-tamper-58mm",
    name: "Precision Impact Tamper – 58mm",
    tagline: "30lb. Self-leveling. Every time.",
    description:
      "Achieve professional-level consistency with the mokhaLab Spring-Loaded Calibrated Tamper. The self-leveling design sits flush against your portafilter for a perfectly flat puck every time. The internal 30lb constant-pressure mechanism delivers a tactile impact feel that guarantees repeatable results regardless of technique — paired with an ergonomic natural wooden handle.",
    prices: { USD: 49.95, CAD: 59.95 },
    image: "/images/ML-PIT-BLK-58-01/main.webp",
    images: [
      "/images/ML-PIT-BLK-58-01/main.webp",
      "/images/ML-PIT-BLK-58-01/02.webp",
      "/images/ML-PIT-BLK-58-01/03.webp",
      "/images/ML-PIT-BLK-58-01/04.webp",
      "/images/ML-PIT-BLK-58-01/05.webp",
      "/images/ML-PIT-BLK-58-01/06.webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GVVR29R8",
      ca: "https://www.amazon.ca/dp/B0GVVR29R8",
    },
    features: [
      { icon: "zap", title: "30lb Calibrated Pressure", description: "Constant spring-loaded mechanism ensures consistent 30lb compression every brew." },
      { icon: "check", title: "Self-Leveling Design", description: "Leveling plate sits flush against the portafilter rim — no tilted tamps, no channeling." },
      { icon: "layers", title: "Wood & Steel Construction", description: "Food-safe stainless steel base with an ergonomic natural wooden handle." },
      { icon: "circle", title: "Tactile Impact Feedback", description: "Internal spring gives a distinct impact feel when required pressure is reached." },
    ],
    specs: [
      { label: "Model", value: "ML-PIT-BLK-58-01" },
      { label: "Size", value: "58mm" },
      { label: "Spring Pressure", value: "30lb" },
      { label: "Material", value: "Aluminum, Stainless Steel, Wood" },
      { label: "Color", value: "Black" },
      { label: "UPC", value: "602835779030" },
    ],
    compatibleMachines: machines58,
    youtubeId: "",
    relatedIds: ["ML-FWDT-BLK-01", "ML-GAD-BLK-58-01"],
    variantIds: ["ML-PIT-BLK-53-01", "ML-PIT-BLK-58-01"],
  },
  {
    id: "ML-FWDT-BLK-01",
    slug: "espresso-wdt-distribution-tool",
    name: "Espresso WDT Distribution Tool",
    tagline: "No clumps. No channeling. Just clarity.",
    description:
      "Say goodbye to channeling and uneven extractions. The mokhaLab WDT tool breaks up clumps in your coffee grounds, ensuring a perfectly even density throughout your portafilter. The innovative flick mechanism dispenses 6 precision needles with a press and retracts them with a shake — no pricked fingers, no bent needles.",
    prices: { USD: 29.95, CAD: 39.95 },
    image: "/images/ML-FWDT-BLK-01/602835779061.main.webp",
    images: [
      "/images/ML-FWDT-BLK-01/602835779061.main.webp",
      "/images/ML-FWDT-BLK-01/f.webp",
      "/images/ML-FWDT-BLK-01/43.webp",
      "/images/ML-FWDT-BLK-01/444.webp",
      "/images/ML-FWDT-BLK-01/2 (3).webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GW4Z3KJX",
      ca: "https://www.amazon.ca/dp/B0GW4Z3KJX",
    },
    features: [
      { icon: "zap", title: "Flick Mechanism", description: "Press the top to dispense needles, shake to retract. No pricked fingers, no bent needles." },
      { icon: "circle", title: "6 Precision Needles", description: "Food-grade stainless steel needles, spaced for efficient distribution without creating new clumps." },
      { icon: "layers", title: "Magnetic Storage", description: "Built-in magnets let you stick the tool to your espresso machine or any metal surface." },
      { icon: "check", title: "Premium Pen Design", description: "High-quality metal with a matte finish and ergonomic pen-style grip for precise, natural movements." },
    ],
    specs: [
      { label: "Model", value: "ML-FWDT-BLK-01" },
      { label: "Needles", value: "6 x Food-Grade Stainless Steel" },
      { label: "Material", value: "18/8 Stainless Steel, Aluminum" },
      { label: "Color", value: "Matte Black" },
      { label: "Weight", value: "100.3g" },
      { label: "Dimensions", value: "15.24 x 6.35 x 4.57 cm" },
    ],
    compatibleMachines: ["Universal — fits all standard portafilter sizes"],
    youtubeId: "",
    relatedIds: ["ML-GAD-BLK-58-01", "ML-WTS-WLN-01"],
  },
  {
    id: "ML-GAD-BLK-58-01",
    slug: "gravity-adaptive-distributor",
    name: "Gravity Adaptive Distributor",
    tagline: "Self-leveling. Every time. No guesswork.",
    description:
      "Master your espresso prep with the mokhaLab Gravity Adaptive Distributor. The intelligent self-adjusting mechanism automatically sinks to the perfect depth of your coffee grounds, using gravity to level the bed for a perfectly even surface every time — no manual height adjustments needed. Premium walnut handle meets food-grade stainless steel base.",
    prices: { USD: 49.95, CAD: 59.95 },
    image: "/images/ML-GAD-BLK-58-01/602835779047.main.webp",
    images: [
      "/images/ML-GAD-BLK-58-01/602835779047.main.webp",
      "/images/ML-GAD-BLK-58-01/602835779047.33.webp",
      "/images/ML-GAD-BLK-58-01/2.webp",
      "/images/ML-GAD-BLK-58-01/4.webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GW4B2P46",
    },
    features: [
      { icon: "zap", title: "Gravity Adaptive Technology", description: "Self-leveling base automatically adjusts to your coffee dose — no manual height calibration needed." },
      { icon: "check", title: "Superior Extraction", description: "A consistently level coffee bed eliminates air pockets and prevents channeling for a richer, balanced espresso." },
      { icon: "layers", title: "Walnut & Stainless Steel", description: "Ergonomic natural walnut handle paired with a heavy-duty food-safe stainless steel base." },
      { icon: "circle", title: "Universal 58mm Fit", description: "Precision-engineered for all standard 58mm portafilters — home and commercial." },
    ],
    specs: [
      { label: "Model", value: "ML-GAD-BLK-58-01" },
      { label: "Diameter", value: "58mm" },
      { label: "Material", value: "18/8 Stainless Steel, Aluminum, Walnut Wood" },
      { label: "Color", value: "Black" },
      { label: "Weight", value: "381g" },
      { label: "Dimensions", value: "7.62 x 7.62 x 5.08 cm" },
    ],
    compatibleMachines: machines58,
    youtubeId: "",
    relatedIds: ["ML-WTS-WLN-01", "ML-WBT-2PK-01"],
  },
  {
    id: "ML-WTS-WLN-01",
    slug: "tamper-station",
    name: "Tamper Station",
    tagline: "Your barista corner, beautifully organized.",
    description:
      "Transform your coffee corner into a professional barista workstation. Crafted from premium solid walnut wood, this tamper station combines organic beauty with functional design. The bear-inspired layout organizes your tamper, distributor, and portafilter into a compact footprint, while adjustable height and non-slip silicone pads keep everything stable and scratch-free.",
    prices: { USD: 69.95, CAD: 89.95 },
    image: "/images/ML-WTS-WLN-01/602835779054.main.webp",
    images: [
      "/images/ML-WTS-WLN-01/602835779054.main.webp",
      "/images/ML-WTS-WLN-01/2.webp",
      "/images/ML-WTS-WLN-01/3.webp",
      "/images/ML-WTS-WLN-01/4 (1)~3.webp",
      "/images/ML-WTS-WLN-01/06.webp",
      "/images/ML-WTS-WLN-01/07.webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GW4K1C2H",
      ca: "https://www.amazon.ca/dp/B0GW4K1C2H",
    },
    features: [
      { icon: "layers", title: "Premium Solid Walnut", description: "Each station is uniquely grained from high-quality walnut, offering a heavy, durable feel and a sophisticated aesthetic." },
      { icon: "circle", title: "Bear-Inspired Layout", description: "A subtle, playful footprint that organizes your tamper, distributor, and portafilter into one compact station." },
      { icon: "check", title: "Adjustable Height", description: "An adjustable nut lets you customize the tamping surface height for a perfectly level tamp every time." },
      { icon: "zap", title: "Non-Slip Base", description: "Thick silicone pads prevent sliding and protect your countertops from scratches during high-pressure tamping." },
    ],
    specs: [
      { label: "Model", value: "ML-WTS-WLN-01" },
      { label: "Material", value: "Solid Walnut Wood" },
      { label: "Color", value: "Walnut" },
      { label: "Assembly Required", value: "No" },
      { label: "Base", value: "Silicone Non-Slip Pads" },
      { label: "Brand", value: "mokhaLab" },
    ],
    compatibleMachines: ["Universal — fits all standard portafilter sizes"],
    youtubeId: "",
    relatedIds: ["ML-GAD-BLK-58-01", "ML-WBT-2PK-01"],
  },
  {
    id: "ML-WBT-2PK-01",
    slug: "barista-towels-2-pack",
    name: "Barista Towels 2-Pack",
    tagline: "Clean hands. Clean gear. Clean shots.",
    description:
      "Achieve barista-level cleanliness with the mokhaLab Barista Towels 2-Pack. Crafted from 100% cotton with a premium waffle weave texture, these towels are highly absorbent and built for daily use. The set includes one coffee-coloured and one white towel so you can designate each for different cleaning tasks — from wiping steam wands to polishing portafilters.",
    prices: { USD: 14.95, CAD: 19.95 },
    image: "/images/ML-WBT-2PK-01/602835779078.main.webp",
    images: [
      "/images/ML-WBT-2PK-01/602835779078.main.webp",
      "/images/ML-WBT-2PK-01/2.webp",
      "/images/ML-WBT-2PK-01/3.webp",
      "/images/ML-WBT-2PK-01/4444.webp",
      "/images/ML-WBT-2PK-01/2 (2).webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GW4RL842",
      ca: "https://www.amazon.ca/dp/B0GW4RL842",
    },
    features: [
      { icon: "layers", title: "Premium Waffle Weave", description: "Highly absorbent waffle weave texture effectively cleans espresso machines and coffee equipment." },
      { icon: "check", title: "100% Cotton", description: "Pure cotton fibres deliver superior absorbency and durability for daily home or commercial use." },
      { icon: "circle", title: "Optimal 30x30cm Size", description: "Ample coverage for cleaning portafilters, steam wands, drip trays, and countertops." },
      { icon: "zap", title: "Dual Colour Set", description: "One coffee-coloured and one white towel so you can designate each for different cleaning tasks." },
    ],
    specs: [
      { label: "Model", value: "ML-WBT-2PK-01" },
      { label: "Pack Size", value: "2 Towels" },
      { label: "Material", value: "100% Cotton" },
      { label: "Weave", value: "Waffle Weave" },
      { label: "Dimensions", value: "30x30cm" },
      { label: "Colors", value: "Coffee & White" },
    ],
    compatibleMachines: [],
    youtubeId: "",
    relatedIds: ["ML-GAD-BLK-58-01", "ML-WTS-WLN-01"],
  },
]

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

Amplify.configure(outputs)

const client = generateClient<Schema>({ authMode: "userPool" })

async function main() {
  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const product of products) {
    try {
      // Check if a Product with the same id already exists (idempotency)
      const { data: existing } = await client.models.Product.get({ id: product.id })

      if (existing) {
        console.log(`[SKIP] ${product.id} — already exists`)
        skippedCount++
        continue
      }

      const amazonUrlUS = product.amazonUrls?.us ?? product.amazonUrl ?? undefined
      const amazonUrlCA = product.amazonUrls?.ca ?? undefined
      const youtubeId =
        product.youtubeId && product.youtubeId.trim() !== "" ? product.youtubeId : undefined

      await client.models.Product.create({
        id: product.id,
        slug: product.slug,
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        priceUSD: product.prices.USD,
        priceCAD: product.prices.CAD,
        image: product.image,
        images: product.images,
        ...(amazonUrlUS !== undefined && { amazonUrlUS }),
        ...(amazonUrlCA !== undefined && { amazonUrlCA }),
        availableUS: true,
        availableCA: true,
        features: JSON.stringify(product.features),
        specs: JSON.stringify(product.specs),
        compatibleMachines: product.compatibleMachines,
        relatedIds: product.relatedIds,
        ...(product.variantIds !== undefined && { variantIds: product.variantIds }),
        ...(youtubeId !== undefined && { youtubeId }),
        ...(product.rating !== undefined && { rating: product.rating }),
        ...(product.ratingCount !== undefined && { ratingCount: product.ratingCount }),
      })

      console.log(`[CREATE] ${product.id} — "${product.name}"`)
      createdCount++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[ERROR] ${product.id} — ${message}`)
      errorCount++
    }
  }

  console.log(`\nCreated: ${createdCount} | Skipped: ${skippedCount} | Errors: ${errorCount}`)
}

main()
