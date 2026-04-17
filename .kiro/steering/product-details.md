# Product Details Standards

This document defines the rules and structure for adding or updating products in `src/lib/products.ts`.

## Product Title

Keep titles minimal — strip marketing copy, adjectives, and descriptors. Keep only the core product name.

**Bad:**
> Espresso WDT Distribution Tool - Professional Retractable 6-Needle Coffee Stirrer - Magnetic Manual Powder Distributor for Portafilter - Matte Black Pen Design

**Good:**
> Espresso WDT Distribution Tool

Rule: Take only the first segment before any dash (`-`) or comma, unless the first segment alone is too vague (e.g. "Tool"). In that case, include the next meaningful word.

---

## Model Number

Every product must have a model number. **The model number is always provided by the user. Never generate or infer one.**

The model number is used as the product `id` (lowercased, with hyphens) and also added as a spec entry.

Example for model `ML-WTS-WLN-01`:
```ts
id: "ML-WTS-WLN-01",
specs: [
  { label: "Model", value: "ML-WTS-WLN-01" },
  ...
]
```

---

## Amazon Links

Every product must have **two** Amazon links: one for the USA store and one for the Canada store.

Ask the user for the product **ASIN** and construct the links as:

```ts
amazonUrls: {
  us: "https://www.amazon.com/dp/[ASIN]",
  ca: "https://www.amazon.ca/dp/[ASIN]",
}
```

If the USA and Canada ASINs differ, ask for both separately. If only one ASIN is provided, use it for both stores.

---

## Prices

Prices are currently **not displayed** in the UI and are not required when adding new products. Set both to `0` as a placeholder:

```ts
prices: { USD: 0, CAD: 0 }
```

---

## Related Products

If the user doesn't specify related products, assign them randomly from existing products.

---

## Product Variations

When a product comes in multiple sizes or colors, represent each variation as a separate product entry with its own `id`, model number, and Amazon links.

Link variations together using the `relatedIds` array so they appear as related products on the product page.

### Naming Convention for Variations

Append the variation to the product name:

- `Precision Tamper – 58mm`
- `Precision Tamper – 53mm`
- `WDT Distributor – Black`
- `WDT Distributor – Silver`

### Model Number for Variations

Each variation must have its own model number, provided by the user. Never generate or infer model numbers for variations.

### Specs for Variations

Include a `Variant` spec entry to make the variation explicit on the product page:

```ts
{ label: "Size", value: "58mm" }
// or
{ label: "Color", value: "Matte Black" }
```

---

## Product Images

Images are located in `/public/images/[MODEL-NUMBER]/` where `[MODEL-NUMBER]` matches the product's model number exactly.

Example for model `ML-FWDT-BLK-01`:
```
/public/images/ML-FWDT-BLK-01/main.jpg
/public/images/ML-FWDT-BLK-01/angle.jpg
/public/images/ML-FWDT-BLK-01/detail.jpg
```

Reference them in the product entry as:
```ts
image: "/images/ML-FWDT-BLK-01/main.jpg",
images: [
  "/images/ML-FWDT-BLK-01/main.jpg",
  "/images/ML-FWDT-BLK-01/angle.jpg",
  "/images/ML-FWDT-BLK-01/detail.jpg",
]
```

Use the actual filenames found in the folder — do not assume or generate image filenames.

---

## Full Product Entry Example (with variations)

```ts
{
  id: "wdt-distributor-black",
  name: "WDT Distributor – Black",
  tagline: "Eliminate every clump. Unlock every shot.",
  description: "...",
  prices: { USD: 0, CAD: 0 },
  image: "/images/product-distributor-black.jpg",
  images: [...],
  amazonUrls: {
    us: "https://www.amazon.com/dp/XXXXXXXXXX",
    ca: "https://www.amazon.ca/dp/XXXXXXXXXX",
  },
  features: [...],
  specs: [
    { label: "Model", value: "ML-FWDT-BLK-01" },
    { label: "Color", value: "Matte Black" },
    // ...other specs
  ],
  compatibleMachines: [...],
  youtubeId: "...",
  relatedIds: ["wdt-distributor-silver", "precision-tamper", "dosing-funnel"],
}
```
