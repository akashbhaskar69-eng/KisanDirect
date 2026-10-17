# KisanDirect — Farmer-to-Consumer Marketplace

A responsive front-end demo for the hackathon problem statement about reducing unnecessary intermediaries in agricultural supply chains.

## Run it in VS Code

**Option 1 — one click on Windows:**
1. Extract `kisandirect_marketplace.zip`.
2. Open the folder and double-click `OPEN_WEBSITE.bat`. It opens `index.html` in your default browser.

**Option 2 — VS Code:**
1. Open the `kisandirect_marketplace` folder in VS Code.
2. Install the **Live Server** extension if you do not already have it.
3. Right-click `index.html` and choose **Open with Live Server**.

You can also double-click `index.html` directly. There is no build step and no external font download is needed.

## Features

- Responsive HTML and CSS layout for desktop and mobile.
- Search listings by produce, farmer, location, category, or description.
- Filter by vegetables, fruits, grains, and dairy.
- Sort by recommended, price, or name.
- Add products to a basket, change quantities, and view an estimated total.
- Save products for later.
- Submit a new farmer listing through a validated form.
- Store demo listings, saved products, and basket in browser `localStorage`.
- Demo checkout that does not collect payment details or place a real order.

## Important demo limitation

This is a front-end prototype. Listings and the basket are stored only in the current browser. It does **not** yet include shared online accounts, a real database, payments, delivery scheduling, or server-side authentication. Those require a backend and deployment before a real public marketplace can be used.

## Files

- `index.html` — page structure
- `style.css` — design and responsive layouts
- `script.js` — sample data, search/filter, listings, basket, and local storage
