import dotenv from "dotenv"

dotenv.config()

const NODE_ENV = process.env.NODE_ENV || "development"
const PORT = Number(process.env.PORT) || 5000
const JWT_SECRET =
  process.env.JWT_SECRET || "pizzahub_jwt_secret_dev_32_characters_random_key_12345"
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || JWT_SECRET

if (NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn(
    "[env] WARNING: JWT_SECRET is not set in production. Set a strong secret before deploying."
  )
}

if (NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  console.warn(
    "[env] WARNING: BETTER_AUTH_SECRET is not set in production. Set a dedicated strong secret."
  )
}

export const env = {
  PORT,
  NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/pizzahubdb",
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || `http://localhost:${PORT}`,
  BETTER_AUTH_SECRET,
  COOKIE_NAME: process.env.COOKIE_NAME || "pizzahub_token",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID || "",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@pizzahub.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Admin@123",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
}
