import { machines53and54, machines58 } from "@/lib/machines"

export interface Product {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  prices: { USD: number; CAD: number }
  image: string
  images: string[]
  amazonUrl?: string
  amazonUrls?: { us: string; ca: string }
  features: { icon: string; title: string; description: string }[]
  specs: { label: string; value: string }[]
  compatibleMachines: string[]
  youtubeId: string
  relatedIds: string[]
  variantIds?: string[]
}

export const products: Product[] = [
  {
    id: "ML-PIT-BLK-53-01",
    slug: "precision-impact-tamper-53mm",
    name: "Precision Impact Tamper – 53mm",
    tagline: "30lb. Self-leveling. Every time.",
    description:
      "Achieve professional-level consistency with the mokhaLab Spring-Loaded Calibrated Tamper. The self-leveling design sits flush against your portafilter for a perfectly flat puck every time. The internal 30lb constant-pressure mechanism delivers a tactile impact feel that guarantees repeatable results regardless of technique — paired with an ergonomic natural wooden handle.",
    prices: { USD: 0, CAD: 0 },
    image: "/images/ML-PIT-BLK-53-01/602835779023.main.webp",
    images: [
      "/images/ML-PIT-BLK-53-01/602835779023.main.webp",
      "/images/ML-PIT-BLK-53-01/2.webp",
      "/images/ML-PIT-BLK-53-01/3.webp",
      "/images/ML-PIT-BLK-53-01/4.webp",
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
    prices: { USD: 0, CAD: 0 },
    image: "/images/ML-PIT-BLK-58-01/602835779023.main.webp",
    images: [
      "/images/ML-PIT-BLK-58-01/602835779023.main.webp",
      "/images/ML-PIT-BLK-58-01/2.webp",
      "/images/ML-PIT-BLK-58-01/3.webp",
      "/images/ML-PIT-BLK-58-01/4.webp",
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
    prices: { USD: 0, CAD: 0 },
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
    prices: { USD: 0, CAD: 0 },
    image: "/images/ML-GAD-BLK-58-01/602835779047.main.webp",
    images: [
      "/images/ML-GAD-BLK-58-01/602835779047.main.webp",
      "/images/ML-GAD-BLK-58-01/602835779047.33.webp",
      "/images/ML-GAD-BLK-58-01/2.webp",
      "/images/ML-GAD-BLK-58-01/3.webp",
      "/images/ML-GAD-BLK-58-01/4.webp",
    ],
    amazonUrls: {
      us: "https://www.amazon.com/dp/B0GW4B2P46",
      ca: "https://www.amazon.ca/dp/B0GW4B2P46",
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
    prices: { USD: 0, CAD: 0 },
    image: "/images/ML-WTS-WLN-01/602835779054.main.webp",
    images: [
      "/images/ML-WTS-WLN-01/602835779054.main.webp",
      "/images/ML-WTS-WLN-01/2.webp",
      "/images/ML-WTS-WLN-01/3.webp",
      "/images/ML-WTS-WLN-01/4 (1)~3.webp",
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

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getRelatedProducts(ids: string[]): Product[] {
  return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]
}

export function getVariants(ids: string[]): Product[] {
  return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]
}
