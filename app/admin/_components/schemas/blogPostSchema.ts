import { z } from "zod"

export const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  // No .default() here — default value is set in useForm defaultValues
  author: z.string().min(1, "Author is required"),
  body: z.string().min(1, "Body content is required"),
  featuredImage: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
})

export type BlogPostFormData = z.infer<typeof blogPostSchema>
