import { betterAuth } from "better-auth"
import { mongodbAdapter } from "@better-auth/mongo-adapter"
import mongoose from "mongoose"
import { env, getAllowedOrigins } from "./env.js"
import { connectDB } from "./db.js"

const socialProviders = {}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account",
  }
}

let authInstance = null
let authDbRef = null

function buildAuth(db) {
  return betterAuth({
    database: mongodbAdapter(db, {
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
}

/**
 * Better Auth shares the Mongoose-managed MongoDB connection. Creating a
 * separate MongoClient inside a serverless function caused its topology to be
 * closed between invocations ("Topology is closed"), which broke sign-in.
 */
export async function getAuth() {
  await connectDB()

  if (!mongoose.connection.db) {
    throw new Error("Database connection is not ready for authentication.")
  }

  // Rebuild if Mongoose replaced its underlying Db after a reconnect.
  if (authInstance && authDbRef === mongoose.connection.db) {
    return authInstance
  }

  authDbRef = mongoose.connection.db
  authInstance = buildAuth(authDbRef)
  return authInstance
}
