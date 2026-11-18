import { betterAuth } from "better-auth"
import { mongodbAdapter } from "@better-auth/mongo-adapter"
import { MongoClient } from "mongodb"
import { env, getAllowedOrigins } from "./env.js"

const mongoClient = new MongoClient(env.MONGO_URI)

export const authDb = mongoClient.db()

const socialProviders = {}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account",
  }
}

export const auth = betterAuth({
  database: mongodbAdapter(authDb, {
    client: mongoClient,
    transaction: false,
  }),
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/better-auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: getAllowedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
      businessName: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      path: "/",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
    },
  },
})
