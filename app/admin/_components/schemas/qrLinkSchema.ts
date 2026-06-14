import { z } from "zod"

export const qrLinkSchema = z.object({
  destinationUrl: z
    .string()
    .min(1, "Destination URL is required")
    .url("Must be a valid HTTP or HTTPS URL"),
  label: z.string().min(1, "Label is required"),
  customCode: z
    .string()
    .regex(/^[A-Za-z0-9]{3,120}$/, "Code must be 3–120 alphanumeric characters (stored as lowercase)")
    .optional()
    .or(z.literal("")),
})

export type QrLinkFormData = z.infer<typeof qrLinkSchema>
