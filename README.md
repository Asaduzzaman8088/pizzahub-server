# PizzaHub — Server

The Express + MongoDB REST API for **PizzaHub**, a multi-vendor pizza ordering platform. It provides authentication, role-based authorization, menu and order management, reviews, wishlist, admin moderation, and Stripe subscription payments.

- **Live API:** https://pizzahub-server-eight.vercel.app
- **Server repository:** https://github.com/Asaduzzaman8088/pizzahub-server
- **Client repository:** https://github.com/Asaduzzaman8088/pizzahub-client

## Features

- **Better Auth** for email/password credential auth (MongoDB adapter) plus Google OAuth support.
- JWT issuance + `verifyToken` and `requireRole` middleware for every protected route.
- Role model: `customer`, `vendor`, `admin`; public registration cannot create admins.
- Password rule enforcement (6+ chars, uppercase + lowercase).
- Menu CRUD with admin approval workflow (`pending` / `approved` / `rejected` / `inactive`) and a separate vendor availability toggle.
- Vendor plan limits: free = 3 active items, Premium = unlimited.
- Admin approve/reject/feature/delete for menu items.
- Orders with status lifecycle (`pending` / `accepted` / `rejected` / `cancelled`), ownership checks, and duplicate active-order prevention.
- Reviews and ratings with automatic rating recalculation.
- Customer wishlist.
- Stripe Checkout for **vendor Premium subscriptions only**. Premium is activated only by a verified webhook (`checkout.session.completed`), downgraded on `customer.subscription.deleted` / `updated` (canceled/unpaid) and failed invoices.
- Admin read-only transactions endpoint.
- Helmet, CORS whitelist, rate limiting, centralized error handling, custom 404.
- Demo seed script with vendors, customers, admin, pizzas, sides, drinks, desserts, and reviews.

## Tech Stack

| Area | Packages |
| --- | --- |
| Runtime | Node.js (ES Modules) |
| Framework | Express 4 |
| Database | MongoDB, Mongoose, official `mongodb` driver |
| Auth | `better-auth`, `@better-auth/mongo-adapter`, `jsonwebtoken`, `bcryptjs` (legacy migration), `cookie-parser` |
| Payments | `stripe` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Tooling | `nodemon`, `dotenv`, `morgan` |

## Project Structure

```
src/
├── app.js                     # Express app, CORS, rate limit, Better Auth mount
├── index.js                   # Server bootstrap + graceful shutdown
├── config/
│   ├── auth.js                # Better Auth configuration
│   ├── db.js                  # Mongoose connection
│   └── env.js                 # Environment validation/defaults
├── controllers/               # auth, menu, order, review, wishlist, stripe, dashboard, admin
├── middlewares/               # verifyToken / requireRole / error handling
├── models/                    # User, MenuItem, Order, Review, Wishlist, Transaction
├── routes/                    # /api route registry
├── seed/seed.js               # Demo data
└── utils/                     # ApiError, asyncHandler, password, ratings, subscription
```

## Getting Started

```bash
npm install
cp .env.example .env
npm run seed     # optional demo data (also creates admin credentials)
npm run dev
```

API runs at http://localhost:5000. Health check: `GET /api/health`.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Server port (default `5000`) |
| `NODE_ENV` | No | `development` / `production` |
| `CLIENT_URL` | Yes | Primary client origin for CORS and Stripe redirects |
| `ALLOWED_ORIGINS` | No | Comma-separated extra origins (e.g. Vercel preview URLs) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | No | JWT lifetime (default `7d`) |
| `BETTER_AUTH_URL` | Yes | Public server URL used by Better Auth |
| `BETTER_AUTH_SECRET` | Yes | Better Auth signing secret (separate from JWT) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No | Seeded admin credentials |
| `STRIPE_SECRET_KEY` | Yes (payments) | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes (payments) | Stripe webhook signing secret |
| `STRIPE_PREMIUM_PRICE_ID` | Yes (payments) | Stripe recurring Price ID for Premium |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth credentials |

Never commit `.env`; only `.env.example` is tracked.

### Scripts

```bash
npm run dev     # node --watch
npm run start   # production
npm run seed    # seed demo data
```

## Auth architecture

- **Better Auth** owns credential storage and exposes its endpoints under `/api/better-auth/*` (mounted with `toNodeHandler`).
- The Express auth controllers call `auth.api.signUpEmail` / `auth.api.signInEmail`, then link the Better Auth user to the business `users` document via `authUserId` and issue the app JWT.
- Legacy bcrypt accounts (including seeded demo users) are verified with bcrypt on first login and transparently migrated into Better Auth.
- All protected APIs use `verifyToken` + `requireRole`, so client-side checks are never trusted.

## Stripe subscription flow

1. `POST /api/stripe/create-checkout-session` (vendor only) creates a Stripe Checkout session with `vendorId` metadata.
2. Stripe redirects to `/payment/success` or `/payment/cancel` on the client.
3. `POST /api/stripe/webhook` verifies the signature and activates Premium only on `checkout.session.completed`.
4. Subscription cancellation/expiry downgrades the vendor to free.
5. Admin transactions are read-only; there is no endpoint to edit payment records.

## Challenge implementation notes

### Advanced search and sorting (`GET /api/menu`)
Query parameters:
- `search` — case-insensitive regex on `itemName` and `description`
- `category` — one of `classic`, `vegetarian`, `meat-lovers`, `specialty`, `sides`, `beverages`
- `location` — case-insensitive regex on the item location
- `vendorId` — filter by vendor (`me` for the authenticated vendor)
- `featured=true` — featured items only
- `sort=price-asc | price-desc | rating | oldest | newest`
- `page`, `limit` — pagination (limit capped at 50)

Only `approved` and available items are returned publicly; admins can request other statuses.

### JWT middleware flow
`extractToken` reads `Authorization: Bearer <token>` or the httpOnly cookie → `jwt.verify` → loads the user from MongoDB → rejects missing/blocked users → `requireRole` enforces the role. Errors are mapped to `401` (invalid/expired) or `403` (forbidden).

## Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@pizzahub.com` | `#Admin@2026` (live password; seed default is `Admin@123`) |
| Vendor | `vendor@pizzahub.com` | `Vendor@123` |
| Customer | `customer@pizzahub.com` | `Customer@123` |

## Testing the deployed API

- Health: `GET https://pizzahub-server-eight.vercel.app/api/health`
- Menu: `GET https://pizzahub-server-eight.vercel.app/api/menu?limit=6`
- Stripe webhook endpoint: `https://pizzahub-server-eight.vercel.app/api/stripe/webhook`
- Use the demo accounts above with the Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC) to test the vendor Premium flow.

## Manual testing instructions

1. **Live site:** https://pizzahub-client-two.vercel.app. The API is https://pizzahub-server-eight.vercel.app.
2. **Stripe test mode:** use card `4242 4242 4242 4242`, any future expiry (e.g. `12/34`), any 3-digit CVC (e.g. `123`), and any ZIP/postal code. The Premium plan is `$5.00/month`.
3. **Admin:** `admin@pizzahub.com` / `#Admin@2026`.
4. **Vendor:** `vendor@pizzahub.com` / `Vendor@123`; additional vendors `vendor2@pizzahub.com` through `vendor6@pizzahub.com` also use `Vendor@123`.
5. **Customer:** `customer@pizzahub.com` / `Customer@123`; additional customer `customer2@pizzahub.com` / `Customer@123`.
6. **Premium flow:** sign in as a vendor → **Subscription** → **Upgrade with Stripe** → pay with the test card → **Payment Success**. The webhook activates Premium, features the vendor's listings, and shows the Premium badge. Cancel the subscription in the Stripe Dashboard to test the downgrade.
7. **Menu approval flow:** vendor adds an item (uploads an image) → item is Pending → admin approves it in **Menu Moderation** → it appears on the public menu.
8. **Order flow:** customer places an order with a delivery date/address/message → vendor accepts or rejects it in **Customer Orders** → customer can cancel only while it is pending.
9. Customer orders do not use Stripe; only the vendor Premium subscription does.
10. Google sign-in is enabled for the live domain.
11. Image uploads use ImgBB; use any JPG/PNG for menu items or profile photos.
12. Use a second browser or an incognito window to test vendor and customer flows at the same time.

## Deployment notes (Vercel)

The server ships with a serverless entry point at `api/index.js` and a `vercel.json` that routes all requests to the Express app.

1. Set all required environment variables in the Vercel project:
   - `NODE_ENV=production`
   - `MONGO_URI` — a **cloud** MongoDB URI (Atlas). `127.0.0.1` is not reachable from Vercel.
   - `JWT_SECRET`, `BETTER_AUTH_SECRET` — different, strong random values.
   - `BETTER_AUTH_URL=https://pizzahub-server-eight.vercel.app`
   - `CLIENT_URL=https://pizzahub-client-two.vercel.app`
   - `ALLOWED_ORIGINS` — any extra client origins (optional)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional)
2. CORS is strict: only `CLIENT_URL`, `ALLOWED_ORIGINS`, and localhost in development are accepted. Unknown origins receive `403`.
3. Configure the Stripe webhook endpoint as `https://<server-host>/api/stripe/webhook`.
4. Run `npm run seed` once against the production database to create the admin account.
5. In production the server refuses to boot if any required secret is missing.
