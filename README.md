# 🍕 PizzaHub — Express & MongoDB Backend Server

The official Node.js & Express REST API for **PizzaHub** — an artisan pizza ordering and multi-vendor platform with role-based access control (RBAC), JWT authentication, and Stripe payments for vendor subscriptions.

## 🚀 Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js 4/5
- **Database:** MongoDB & Mongoose ORM
- **Authentication:** JWT & Cookie-based token verification + RBAC
- **Payment Gateway:** Stripe Checkout & Webhook signature verification

## 📁 Architecture & Directory Structure
```
pizzahub-server/
├── src/
│   ├── config/
│   │   ├── db.js             # MongoDB connection with retry & error listeners
│   │   └── env.js            # Environment variable validation & defaults
│   ├── middlewares/
│   │   ├── auth.js           # verifyToken & requireRole RBAC middleware
│   │   └── error.js          # 404 notFound & central error handlers
│   ├── models/
│   │   ├── User.js           # User schema (Customer, Vendor, Admin, Subscription)
│   │   ├── MenuItem.js       # Pizza menu item schema with pending/approved status
│   │   ├── Order.js          # Order schema with lifecycle states
│   │   ├── Transaction.js    # Stripe subscription transaction records
│   │   ├── Review.js         # Customer ratings and reviews
│   │   └── Wishlist.js       # Customer favorite items
│   ├── routes/
│   │   ├── health.js         # /api/health monitoring endpoint
│   │   └── index.js          # Master route registry
│   ├── app.js                # Express app setup, CORS, raw Stripe webhook, parsers
│   └── index.js              # Server entry point & graceful shutdown
├── .env.example
├── .gitignore
└── package.json
```

## ⚙️ Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key variables:
- `PORT`: Server port (default: 5000)
- `CLIENT_URL`: Client URL for CORS whitelist (default: `http://localhost:3000`)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing & verification
- `STRIPE_SECRET_KEY`: Stripe test/live secret key
- `STRIPE_WEBHOOK_SECRET`: Signing secret for Stripe webhooks

## 💻 Running the Server
```bash
npm install
npm run dev
```

Test health check:
```bash
curl http://localhost:5000/api/health
```
