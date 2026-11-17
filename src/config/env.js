import dotenv from "dotenv"

dotenv.config()

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/pizzahubdb",
  JWT_SECRET: process.env.JWT_SECRET || "pizzahub_jwt_secret_dev_32_characters_random_key_12345",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID || "",
}
