import { z } from "zod"

const featureItemSchema = z.object({
  icon: z.string().default("zap"), // hardcoded default, not shown in UI
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
})

const specItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
})

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  tagline: z.string().min(1, "Tagline is required"),
  description: z.string().min(1, "Description is required"),
  priceUSD: z.number({ invalid_type_error: "Must be a number" }).min(0),
  priceCAD: z.number({ invalid_type_error: "Must be a number" }).min(0),
  image: z.string().min(1, "Main image path is required"),
  images: z.array(z.string()).default([]),
  amazonUrlUS: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  amazonUrlCA: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  availableUS: z.boolean().default(true),
  availableCA: z.boolean().default(true),
  // Stored as structured arrays in form state; serialized to JSON on submit
  features: z.array(featureItemSchema).min(1, "At least one feature is required"),
  specs: z.array(specItemSchema).min(1, "At least one spec is required"),
  // compatibleMachines stored as preset keys in form, expanded to machine name arrays on submit
  compatiblePresets: z.array(z.enum(["53-54mm", "58mm"])).default([]),
  relatedIds: z.array(z.string()).default([]),
  variantIds: z.array(z.string()).optional(),
  youtubeId: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().min(0).optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
