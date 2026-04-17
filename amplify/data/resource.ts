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
