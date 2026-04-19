import { defineFunction } from "@aws-amplify/backend"

export const contactFunction = defineFunction({
  name: "contact",
  entry: "./handler.ts",
  environment: {
    // The verified SES sender address — set this in Amplify Console env vars
    // or in your .env.local for sandbox: CONTACT_FROM_EMAIL=you@yourdomain.com
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL ?? "",
    // Where to forward contact submissions
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL ?? "",
  },
})
