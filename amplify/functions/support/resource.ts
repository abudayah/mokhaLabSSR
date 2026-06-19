import { defineFunction } from "@aws-amplify/backend"

export const supportFunction = defineFunction({
  name: "support",
  entry: "./handler.ts",
  environment: {
    // Verified SES sender address — set in Amplify Console env vars or .env.local
    SUPPORT_FROM_EMAIL: process.env.SUPPORT_FROM_EMAIL ?? "",
    // Admin inbox for new ticket alerts
    SUPPORT_ADMIN_EMAIL: process.env.SUPPORT_ADMIN_EMAIL ?? "",
  },
})
