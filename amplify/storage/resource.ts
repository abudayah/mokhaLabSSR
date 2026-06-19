import { defineStorage } from "@aws-amplify/backend"

export const storage = defineStorage({
  name: "mokhaLabSSRBlogImages",
  access: (allow) => ({
    // Authenticated users (admins) can read, write, and delete
    "blog-images/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      // Public (unauthenticated) can read — needed for public blog pages
      allow.guest.to(["read"]),
    ],
    // Support ticket uploads — public write (form submissions), admin read/delete
    "support-uploads/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["write"]),
    ],
  }),
})
