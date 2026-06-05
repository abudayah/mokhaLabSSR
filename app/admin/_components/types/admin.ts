import { z } from "zod"
import { blogPostSchema } from "../schemas/blogPostSchema"

export type BlogPostFormData = z.infer<typeof blogPostSchema>

export type { QrLinkFormData } from "../schemas/qrLinkSchema"
