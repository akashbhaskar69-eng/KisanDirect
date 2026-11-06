# KisanDirect — full-stack farmer-to-consumer marketplace

This project keeps the supplied KisanDirect HTML/CSS design and connects it to an Express API and MongoDB database.

## What is included

- Buyer and farmer registration with password hashing (`bcryptjs`).
- JWT sign-in and a `/api/auth/me` session check.
- Farmer-only product publishing; farmer name and location come from the signed-in profile.
- Shared marketplace listings stored in MongoDB Atlas.
- Search, category filters, sorting, saved products and basket in the browser.
- Server-checked stock and demo order creation; inventory is reduced only after the server validates availability.
- Order history for the signed-in buyer, and farmer order visibility for products they listed.
- Optional Cloudinary image upload (JPG, PNG and WEBP, maximum 5 MB).
- Optional Open-Meteo weather endpoint and data.gov.in mandi-prices endpoint.
- A clear demo checkout flow. **It does not connect to Razorpay, UPI or a bank and never collects real payment details.**

The initial MongoDB database is seeded with the eight sample listings supplied in the original front-end. They are marked as sample listings.

## Requirements

- Node.js 22 or newer
- npm
- A MongoDB Atlas account (free M0 cluster is enough for a small hackathon demo)
- Optional: Cloudinary account for product photos

## Run in VS Code on Windows

1. Extract the project ZIP.
2. Open the `kisandirect_fullstack` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Install the packages:

   ```powershell
   npm install
   ```

5. Create your environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

6. Open `.env` and fill in `MONGODB_URI` and `JWT_SECRET`.
7. Start the server:

   ```powershell
   npm run dev
   ```

8. Open `http://localhost:3000` in your browser. Do not open `index.html` directly and do not use Live Server for the full-stack version.

Check the backend at `http://localhost:3000/api/health`. It should return JSON with `"database":"connected"` after MongoDB connects.

## MongoDB Atlas setup

1. Create a free MongoDB Atlas project and an M0 cluster.
2. Create a **database user** with a strong password. This is separate from your Atlas website login.
3. In **Network Access**, allow your current computer's IP for local development.
4. Open **Connect → Drivers**, copy the Node.js connection string, and put it in `.env` as `MONGODB_URI`.
5. Replace the username, password and cluster placeholders in the URI. If your password contains reserved URL characters, URL-encode them.
6. Restart the server after saving `.env`.

Do not paste your MongoDB connection string, database password, or `.env` file into chat or GitHub. Do not commit `.env`.

## Cloudinary image uploads (optional)

The marketplace works without Cloudinary; farmers can publish listings using the built-in produce emoji. To enable photos, create a Cloudinary account and set these values in `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Restart the server. The browser asks the backend to upload the image; the secret remains on the server.

## Optional data APIs

- Weather: `GET /api/external/weather?latitude=23.52&longitude=87.31`. This calls Open-Meteo and does not need an API key.
- Mandi prices: `GET /api/external/mandi-prices`. Set `DATA_GOV_IN_API_KEY` and `DATA_GOV_IN_RESOURCE_ID` in `.env`. Verify that the selected resource is still available on data.gov.in; the resource ID is configurable because datasets can change.

These API endpoints are available for a future dashboard widget; they are not required to run the marketplace.

## Demo flow

1. Register a **Farmer / Seller** account with a farm name and location.
2. Sign in as the farmer and choose **Sell produce** to publish a listing.
3. Register a separate **Buyer** account (or sign out and create one).
4. Add produce to the basket and use **Place demo order**.
5. Enter a delivery address. The app saves a simulated order to MongoDB and updates stock.
6. Open **My orders** to view saved demo orders.

**Demo payment means no money moves.** Do not enter UPI PINs, card details, banking passwords or other payment credentials. The checkout only writes an order with `paymentStatus: demo_simulated`.

## Deployment on Render (optional)

1. Push the project to a private or public GitHub repository. Make sure `.env` is not committed.
2. Create a Render Web Service connected to the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add the environment variables from `.env` in Render's Environment settings.
6. Configure MongoDB Atlas network access for the deployed service using the current Atlas/Render guidance. Use a dedicated database user with access only to the KisanDirect database.

Free hosting plans can sleep when idle, and first requests may be slow. Check the provider's current plan limits before the demo.

## API summary

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Server/database health |
| POST | `/api/auth/register` | Public | Create buyer/farmer account |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/me` | Signed in | Current user profile |
| GET | `/api/products` | Public | List marketplace products |
| POST | `/api/products` | Farmer | Publish a product |
| DELETE | `/api/products/:id` | Listing owner | Remove own product |
| POST | `/api/uploads/image` | Farmer + Cloudinary config | Upload a product image |
| POST | `/api/orders` | Signed in | Place a demo order |
| GET | `/api/orders/mine` | Signed in | View buyer/farmer order history |
| GET | `/api/external/weather` | Public | Open-Meteo current weather |
| GET | `/api/external/mandi-prices` | Public + data.gov.in key | Mandi price data |

## Troubleshooting

- **`MONGODB_URI is not set`:** copy `.env.example` to `.env` and fill in the connection string.
- **MongoDB server selection / DNS error:** verify the cluster hostname, database username/password and Network Access IP allowlist. Check that your computer has internet access.
- **`JWT_SECRET` error:** set a random secret with at least 32 characters in `.env` and restart Node.
- **Products display only the eight sample listings:** check `/api/health`; the database may not be connected.
- **Image upload says not configured:** this is optional. Add Cloudinary credentials or publish without a photo.
- **Port 3000 is busy:** set another `PORT` in `.env`, for example `PORT=3001`, then open the matching localhost URL.

## Prototype security note

This is a learning/hackathon prototype, not a production-ready commerce system. Before real public use, add stronger account recovery, email verification, privacy and terms pages, audit logging, database backups, order cancellation/refund workflows, delivery integration, secure cookie-based sessions/CSRF protection, and a professional security review. Keep API secrets on the server and never expose them in browser JavaScript.
