import { type ClientSchema, a, defineData } from "@aws-amplify/backend"

const schema = a.schema({
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
