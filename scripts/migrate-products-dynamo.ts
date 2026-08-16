/**
 * scripts/migrate-products-dynamo.ts
 *
 * Migrates products directly to DynamoDB, bypassing AppSync.
 * Uses the AWS SDK DynamoDB DocumentClient — works with IAM credentials.
 *
 * Run:
 *   npx tsx scripts/migrate-products-dynamo.ts
 *
 * Target table: Product-ringmjues5ghhn4l2e2pr7fbfu-NONE (production)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import { machines53and54, machines58 } from "@/lib/machines"

const TABLE_NAME = "Product-ringmjues5ghhn4l2e2pr7fbfu-NONE"
const REGION = "us-west-2"

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }))

// ---------------------------------------------------------------------------
// Static product data (was in lib/products.ts)
// ---------------------------------------------------------------------------

const products = [
  {
    id: "ML-K200",
    slug: "mini-coffee-scale",
    name: "Mini Coffee Scale",
    tagline: "Measure. Time. Repeat. Perfectly.",
    description:
      "Every detail of the mokhaLab Mini Coffee Scale is designed to bring greater precision and control to your daily brewing. Weigh coffee and water to 0.1g accuracy while the built-in timer tracks your extraction simultaneously — helping you dial in espresso and refine pour-over recipes with confidence. The compact footprint fits naturally into any setup, and USB-C charging keeps it ready without disposable batteries.",
    priceUSD: 0,
    priceCAD: 0,
    image: "/images/ML-K200/main.webp",
    images: ["/images/ML-K200/main.webp", "/images/ML-K200/03.webp", "/images/ML-K200/04.webp", "/images/ML-K200/02.webp", "/images/ML-K200/05.webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0H8KZS3L8",
    amazonUrlCA: "https://www.amazon.ca/dp/B0H8KZS3L8",
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "zap", title: "0.1g Precision", description: "Measures in precise 0.1g increments to help you dial in espresso shots and maintain consistent pour-over recipes." },
      { icon: "circle", title: "Built-In Brew Timer", description: "Track brew time and weight simultaneously to better understand and control your extraction." },
      { icon: "layers", title: "USB-C Rechargeable", description: "Convenient USB-C charging means no disposable batteries required — always ready for your next brew." },
      { icon: "check", title: "Compact & Versatile", description: "Mini footprint suits espresso, pour over, French press, and more brewing methods." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-K200" }, { label: "Capacity", value: "2kg" }, { label: "Precision", value: "0.1g" },
      { label: "Display", value: "LED" }, { label: "Charging", value: "USB-C" }, { label: "Color", value: "Black" },
      { label: "Dimensions", value: "16.26 x 14.48 x 6.35 cm" }, { label: "Weight", value: "300g" }, { label: "UPC", value: "602835779115" },
    ]),
    compatibleMachines: ["Universal — suits espresso, pour over, French press, and more"],
    relatedIds: ["ML-FWDT-BLK-01", "ML-WTS-WLN-01", "ML-GAD-BLK-58-01"],
    variantIds: null,
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
  {
    id: "ML-PIT-BLK-53-01",
    slug: "precision-impact-tamper-53mm",
    name: "Precision Impact Tamper \u2013 53mm",
    tagline: "30lb. Self-leveling. Every time.",
    description:
      "Achieve professional-level consistency with the mokhaLab Spring-Loaded Calibrated Tamper. The self-leveling design sits flush against your portafilter for a perfectly flat puck every time. The internal 30lb constant-pressure mechanism delivers a tactile impact feel that guarantees repeatable results regardless of technique \u2014 paired with an ergonomic natural wooden handle.",
    priceUSD: 49.95,
    priceCAD: 59.95,
    image: "/images/ML-PIT-BLK-53-01/main.webp",
    images: ["/images/ML-PIT-BLK-53-01/main.webp", "/images/ML-PIT-BLK-53-01/02.webp", "/images/ML-PIT-BLK-53-01/03.webp", "/images/ML-PIT-BLK-53-01/04.webp", "/images/ML-PIT-BLK-53-01/05.webp", "/images/ML-PIT-BLK-53-01/06.webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0GVW4DT9Y",
    amazonUrlCA: "https://www.amazon.ca/dp/B0GVW4DT9Y",
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "zap", title: "30lb Calibrated Pressure", description: "Constant spring-loaded mechanism ensures consistent 30lb compression every brew." },
      { icon: "check", title: "Self-Leveling Design", description: "Leveling plate sits flush against the portafilter rim \u2014 no tilted tamps, no channeling." },
      { icon: "layers", title: "Wood & Steel Construction", description: "Food-safe stainless steel base with an ergonomic natural wooden handle." },
      { icon: "circle", title: "Tactile Impact Feedback", description: "Internal spring gives a distinct impact feel when required pressure is reached." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-PIT-BLK-53-01" }, { label: "Size", value: "53mm" }, { label: "Spring Pressure", value: "30lb" },
      { label: "Material", value: "Aluminum, Stainless Steel, Wood" }, { label: "Color", value: "Black" }, { label: "UPC", value: "602835779030" },
    ]),
    compatibleMachines: machines53and54,
    relatedIds: ["ML-FWDT-BLK-01", "ML-GAD-BLK-58-01"],
    variantIds: ["ML-PIT-BLK-53-01", "ML-PIT-BLK-58-01"],
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
  {
    id: "ML-PIT-BLK-58-01",
    slug: "precision-impact-tamper-58mm",
    name: "Precision Impact Tamper \u2013 58mm",
    tagline: "30lb. Self-leveling. Every time.",
    description:
      "Achieve professional-level consistency with the mokhaLab Spring-Loaded Calibrated Tamper. The self-leveling design sits flush against your portafilter for a perfectly flat puck every time. The internal 30lb constant-pressure mechanism delivers a tactile impact feel that guarantees repeatable results regardless of technique \u2014 paired with an ergonomic natural wooden handle.",
    priceUSD: 49.95,
    priceCAD: 59.95,
    image: "/images/ML-PIT-BLK-58-01/main.webp",
    images: ["/images/ML-PIT-BLK-58-01/main.webp", "/images/ML-PIT-BLK-58-01/02.webp", "/images/ML-PIT-BLK-58-01/03.webp", "/images/ML-PIT-BLK-58-01/04.webp", "/images/ML-PIT-BLK-58-01/05.webp", "/images/ML-PIT-BLK-58-01/06.webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0GVVR29R8",
    amazonUrlCA: "https://www.amazon.ca/dp/B0GVVR29R8",
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "zap", title: "30lb Calibrated Pressure", description: "Constant spring-loaded mechanism ensures consistent 30lb compression every brew." },
      { icon: "check", title: "Self-Leveling Design", description: "Leveling plate sits flush against the portafilter rim \u2014 no tilted tamps, no channeling." },
      { icon: "layers", title: "Wood & Steel Construction", description: "Food-safe stainless steel base with an ergonomic natural wooden handle." },
      { icon: "circle", title: "Tactile Impact Feedback", description: "Internal spring gives a distinct impact feel when required pressure is reached." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-PIT-BLK-58-01" }, { label: "Size", value: "58mm" }, { label: "Spring Pressure", value: "30lb" },
      { label: "Material", value: "Aluminum, Stainless Steel, Wood" }, { label: "Color", value: "Black" }, { label: "UPC", value: "602835779030" },
    ]),
    compatibleMachines: machines58,
    relatedIds: ["ML-FWDT-BLK-01", "ML-GAD-BLK-58-01"],
    variantIds: ["ML-PIT-BLK-53-01", "ML-PIT-BLK-58-01"],
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
  {
    id: "ML-FWDT-BLK-01",
    slug: "espresso-wdt-distribution-tool",
    name: "Espresso WDT Distribution Tool",
    tagline: "No clumps. No channeling. Just clarity.",
    description:
      "Say goodbye to channeling and uneven extractions. The mokhaLab WDT tool breaks up clumps in your coffee grounds, ensuring a perfectly even density throughout your portafilter. The innovative flick mechanism dispenses 6 precision needles with a press and retracts them with a shake \u2014 no pricked fingers, no bent needles.",
    priceUSD: 29.95,
    priceCAD: 39.95,
    image: "/images/ML-FWDT-BLK-01/602835779061.main.webp",
    images: ["/images/ML-FWDT-BLK-01/602835779061.main.webp", "/images/ML-FWDT-BLK-01/f.webp", "/images/ML-FWDT-BLK-01/43.webp", "/images/ML-FWDT-BLK-01/444.webp", "/images/ML-FWDT-BLK-01/2 (3).webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0GW4Z3KJX",
    amazonUrlCA: "https://www.amazon.ca/dp/B0GW4Z3KJX",
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "zap", title: "Flick Mechanism", description: "Press the top to dispense needles, shake to retract. No pricked fingers, no bent needles." },
      { icon: "circle", title: "6 Precision Needles", description: "Food-grade stainless steel needles, spaced for efficient distribution without creating new clumps." },
      { icon: "layers", title: "Magnetic Storage", description: "Built-in magnets let you stick the tool to your espresso machine or any metal surface." },
      { icon: "check", title: "Premium Pen Design", description: "High-quality metal with a matte finish and ergonomic pen-style grip for precise, natural movements." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-FWDT-BLK-01" }, { label: "Needles", value: "6 x Food-Grade Stainless Steel" },
      { label: "Material", value: "18/8 Stainless Steel, Aluminum" }, { label: "Color", value: "Matte Black" },
      { label: "Weight", value: "100.3g" }, { label: "Dimensions", value: "15.24 x 6.35 x 4.57 cm" },
    ]),
    compatibleMachines: ["Universal \u2014 fits all standard portafilter sizes"],
    relatedIds: ["ML-GAD-BLK-58-01", "ML-WTS-WLN-01"],
    variantIds: null,
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
  {
    id: "ML-GAD-BLK-58-01",
    slug: "gravity-adaptive-distributor",
    name: "Gravity Adaptive Distributor",
    tagline: "Self-leveling. Every time. No guesswork.",
    description:
      "Master your espresso prep with the mokhaLab Gravity Adaptive Distributor. The intelligent self-adjusting mechanism automatically sinks to the perfect depth of your coffee grounds, using gravity to level the bed for a perfectly even surface every time \u2014 no manual height adjustments needed. Premium walnut handle meets food-grade stainless steel base.",
    priceUSD: 49.95,
    priceCAD: 59.95,
    image: "/images/ML-GAD-BLK-58-01/602835779047.main.webp",
    images: ["/images/ML-GAD-BLK-58-01/602835779047.main.webp", "/images/ML-GAD-BLK-58-01/602835779047.33.webp", "/images/ML-GAD-BLK-58-01/2.webp", "/images/ML-GAD-BLK-58-01/4.webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0GW4B2P46",
    amazonUrlCA: null,
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "zap", title: "Gravity Adaptive Technology", description: "Self-leveling base automatically adjusts to your coffee dose \u2014 no manual height calibration needed." },
      { icon: "check", title: "Superior Extraction", description: "A consistently level coffee bed eliminates air pockets and prevents channeling for a richer, balanced espresso." },
      { icon: "layers", title: "Walnut & Stainless Steel", description: "Ergonomic natural walnut handle paired with a heavy-duty food-safe stainless steel base." },
      { icon: "circle", title: "Universal 58mm Fit", description: "Precision-engineered for all standard 58mm portafilters \u2014 home and commercial." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-GAD-BLK-58-01" }, { label: "Diameter", value: "58mm" },
      { label: "Material", value: "18/8 Stainless Steel, Aluminum, Walnut Wood" }, { label: "Color", value: "Black" },
      { label: "Weight", value: "381g" }, { label: "Dimensions", value: "7.62 x 7.62 x 5.08 cm" },
    ]),
    compatibleMachines: machines58,
    relatedIds: ["ML-WTS-WLN-01", "ML-WBT-2PK-01"],
    variantIds: null,
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
  {
    id: "ML-WTS-WLN-01",
    slug: "tamper-station",
    name: "Tamper Station",
    tagline: "Your barista corner, beautifully organized.",
    description:
      "Transform your coffee corner into a professional barista workstation. Crafted from premium solid walnut wood, this tamper station combines organic beauty with functional design. The bear-inspired layout organizes your tamper, distributor, and portafilter into a compact footprint, while adjustable height and non-slip silicone pads keep everything stable and scratch-free.",
    priceUSD: 69.95,
    priceCAD: 89.95,
    image: "/images/ML-WTS-WLN-01/602835779054.main.webp",
    images: ["/images/ML-WTS-WLN-01/602835779054.main.webp", "/images/ML-WTS-WLN-01/2.webp", "/images/ML-WTS-WLN-01/3.webp", "/images/ML-WTS-WLN-01/4 (1)~3.webp", "/images/ML-WTS-WLN-01/06.webp", "/images/ML-WTS-WLN-01/07.webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0GW4K1C2H",
    amazonUrlCA: "https://www.amazon.ca/dp/B0GW4K1C2H",
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "layers", title: "Premium Solid Walnut", description: "Each station is uniquely grained from high-quality walnut, offering a heavy, durable feel and a sophisticated aesthetic." },
      { icon: "circle", title: "Bear-Inspired Layout", description: "A subtle, playful footprint that organizes your tamper, distributor, and portafilter into one compact station." },
      { icon: "check", title: "Adjustable Height", description: "An adjustable nut lets you customize the tamping surface height for a perfectly level tamp every time." },
      { icon: "zap", title: "Non-Slip Base", description: "Thick silicone pads prevent sliding and protect your countertops from scratches during high-pressure tamping." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-WTS-WLN-01" }, { label: "Material", value: "Solid Walnut Wood" },
      { label: "Color", value: "Walnut" }, { label: "Assembly Required", value: "No" },
      { label: "Base", value: "Silicone Non-Slip Pads" }, { label: "Brand", value: "mokhaLab" },
    ]),
    compatibleMachines: ["Universal \u2014 fits all standard portafilter sizes"],
    relatedIds: ["ML-GAD-BLK-58-01", "ML-WBT-2PK-01"],
    variantIds: null,
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
  {
    id: "ML-WBT-2PK-01",
    slug: "barista-towels-2-pack",
    name: "Barista Towels 2-Pack",
    tagline: "Clean hands. Clean gear. Clean shots.",
    description:
      "Achieve barista-level cleanliness with the mokhaLab Barista Towels 2-Pack. Crafted from 100% cotton with a premium waffle weave texture, these towels are highly absorbent and built for daily use. The set includes one coffee-coloured and one white towel so you can designate each for different cleaning tasks \u2014 from wiping steam wands to polishing portafilters.",
    priceUSD: 14.95,
    priceCAD: 19.95,
    image: "/images/ML-WBT-2PK-01/602835779078.main.webp",
    images: ["/images/ML-WBT-2PK-01/602835779078.main.webp", "/images/ML-WBT-2PK-01/2.webp", "/images/ML-WBT-2PK-01/3.webp", "/images/ML-WBT-2PK-01/4444.webp", "/images/ML-WBT-2PK-01/2 (2).webp"],
    amazonUrlUS: "https://www.amazon.com/dp/B0GW4RL842",
    amazonUrlCA: "https://www.amazon.ca/dp/B0GW4RL842",
    availableUS: true,
    availableCA: true,
    features: JSON.stringify([
      { icon: "layers", title: "Premium Waffle Weave", description: "Highly absorbent waffle weave texture effectively cleans espresso machines and coffee equipment." },
      { icon: "check", title: "100% Cotton", description: "Pure cotton fibres deliver superior absorbency and durability for daily home or commercial use." },
      { icon: "circle", title: "Optimal 30x30cm Size", description: "Ample coverage for cleaning portafilters, steam wands, drip trays, and countertops." },
      { icon: "zap", title: "Dual Colour Set", description: "One coffee-coloured and one white towel so you can designate each for different cleaning tasks." },
    ]),
    specs: JSON.stringify([
      { label: "Model", value: "ML-WBT-2PK-01" }, { label: "Pack Size", value: "2 Towels" },
      { label: "Material", value: "100% Cotton" }, { label: "Weave", value: "Waffle Weave" },
      { label: "Dimensions", value: "30x30cm" }, { label: "Colors", value: "Coffee & White" },
    ]),
    compatibleMachines: [],
    relatedIds: ["ML-GAD-BLK-58-01", "ML-WTS-WLN-01"],
    variantIds: null,
    youtubeId: null,
    rating: null,
    ratingCount: null,
  },
]

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

async function main() {
  let created = 0, skipped = 0, errors = 0
  const now = new Date().toISOString()

  for (const p of products) {
    try {
      // Check if already exists
      const existing = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: p.id },
      }))

      if (existing.Item) {
        console.log(`[SKIP] ${p.id}`)
        skipped++
        continue
      }

      // Build the DynamoDB item — matches Amplify's generated schema shape
      const item: Record<string, unknown> = {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        priceUSD: p.priceUSD,
        priceCAD: p.priceCAD,
        image: p.image,
        images: p.images,
        availableUS: p.availableUS,
        availableCA: p.availableCA,
        features: p.features,
        specs: p.specs,
        compatibleMachines: p.compatibleMachines,
        relatedIds: p.relatedIds,
        __typename: "Product",
        createdAt: now,
        updatedAt: now,
        _lastChangedAt: Date.now(),
        _version: 1,
        _deleted: null,
      }

      // Optional fields — only set if non-null
      if (p.amazonUrlUS) item.amazonUrlUS = p.amazonUrlUS
      if (p.amazonUrlCA) item.amazonUrlCA = p.amazonUrlCA
      if (p.variantIds) item.variantIds = p.variantIds
      if (p.youtubeId) item.youtubeId = p.youtubeId
      if (p.rating != null) item.rating = p.rating
      if (p.ratingCount != null) item.ratingCount = p.ratingCount

      await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)", // idempotent
      }))

      console.log(`[CREATE] ${p.id} — "${p.name}"`)
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("ConditionalCheckFailed")) {
        console.log(`[SKIP] ${p.id} — already exists (race)`)
        skipped++
      } else {
        console.error(`[ERROR] ${p.id} — ${msg}`)
        errors++
      }
    }
  }

  console.log(`\nCreated: ${created} | Skipped: ${skipped} | Errors: ${errors}`)
}

main()
