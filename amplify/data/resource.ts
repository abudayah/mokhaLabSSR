import { type ClientSchema, a, defineData } from "@aws-amplify/backend"

const schema = a.schema({
  SupportTicket: a
    .model({
      // Auto-generated on backend: T-US-001 / T-CA-047
      ticketId: a.string().required(),
      // Basic info
      customerName: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      country: a.enum(["USA", "Canada"]),
      state: a.string().required(),
      // Case type
      caseType: a.enum(["Inquiry", "Warranty", "Return"]),
      productName: a.string().required(),
      amazonPurchase: a.boolean().required(),
      amazonOrderId: a.string(),
      purchaseDate: a.string(),
      issueDescription: a.string().required(),
      // Return-specific
      returnReason: a.string(),
      returnReasonOther: a.string(),
      // Warranty+Return
      preferredResolution: a.string(),
      preferredResolutionOther: a.string(),
      // Contact preference
      preferredContact: a.enum(["Email", "Phone"]),
      // Uploaded photos — stored as comma-separated S3 keys
      photoKeys: a.string(),
      // Proof of purchase — single S3 key
      proofOfPurchaseKey: a.string(),
      // Timestamps
      submissionTimestamp: a.string().required(),
      consentTimestamp: a.string().required(),
      // Admin fields
      status: a.enum(["New", "InProgress", "Resolved", "Closed"]),
      assignedAgent: a.string(),
      internalNotes: a.string(),
      // Response log — JSON array stringified
      responseLog: a.string(),
      // Call log — JSON array stringified
      callLog: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      // Public API key: write-only (submit form), no read
      allow.publicApiKey().to(["create"]),
    ]),

  BlogPost: a
    .model({
      slug: a.string().required(),
      title: a.string().required(),
      subtitle: a.string(),
      date: a.string().required(),
      author: a.string().required(),
      body: a.string().required(),
      featuredImage: a.string(),
    })
    .authorization((allow) => [
      // Authenticated users (admin) can do everything
      allow.authenticated(),
      // Public (API key) can read — for the public blog
      allow.publicApiKey().to(["read"]),
    ]),

  QrLink: a
    .model({
      code: a.string().required(),
      destinationUrl: a.string().required(),
      label: a.string(),
      clickCount: a.integer().default(0),
      lastClickedAt: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.publicApiKey().to(["read", "update"]),  // redirect handler needs read + update for clickCount
    ]),

  ClickEvent: a
    .model({
      qrLinkId: a.string().required(),
      clickedAt: a.string().required(),
      userAgent: a.string(),
      ip: a.string(),
      referer: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read", "create", "update", "delete"]),
      allow.publicApiKey().to(["create"]),
    ]),

  Product: a
    .model({
      // Identity
      id: a.id().required(),
      slug: a.string().required(),
      name: a.string().required(),
      tagline: a.string().required(),
      description: a.string().required(),
      // Pricing
      priceUSD: a.float().required(),
      priceCAD: a.float().required(),
      // Images
      image: a.string().required(),
      images: a.string().array().required(),
      // Amazon storefronts
      amazonUrlUS: a.string(),
      amazonUrlCA: a.string(),
      // Marketplace availability
      availableUS: a.boolean().required(),
      availableCA: a.boolean().required(),
      // Rich fields — JSON-encoded arrays
      features: a.string().required(),   // JSON: FeatureItem[]
      specs: a.string().required(),      // JSON: SpecItem[]
      // Lists
      compatibleMachines: a.string().array().required(),
      relatedIds: a.string().array().required(),
      variantIds: a.string().array(),
      // Optional metadata
      youtubeId: a.string(),
      rating: a.float(),
      ratingCount: a.integer(),
    })
    .secondaryIndexes((index) => [index("slug")])
    .authorization((allow) => [
      allow.authenticated(),
      allow.publicApiKey().to(["read"]),
    ]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
})
