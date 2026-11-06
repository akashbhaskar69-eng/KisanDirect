'use strict';

require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const { requireAuth, requireFarmer } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '250kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again after 15 minutes.' }
});

const sampleProducts = [
  { name: 'Farm-fresh tomatoes', category: 'Vegetables', price: 28, unit: 'kg', quantity: 40, farmerName: 'Rina Family Farm', location: 'Durgapur, WB', description: 'Ripe, juicy tomatoes picked this morning.', emoji: '🍅', tone: 'tomato', tag: 'HARVEST TODAY' },
  { name: 'Sweet red apples', category: 'Fruits', price: 110, unit: 'kg', quantity: 18, farmerName: 'Himalayan Orchard', location: 'Kalimpong, WB', description: 'Crisp apples from a small hillside orchard.', emoji: '🍎', tone: 'apple', tag: 'SEASONAL' },
  { name: 'Green spinach', category: 'Vegetables', price: 20, unit: 'bunch', quantity: 35, farmerName: 'Maya’s Green Patch', location: 'Bardhaman, WB', description: 'Tender leafy greens, freshly bundled.', emoji: '🥬', tone: 'spinach', tag: 'FRESH PICK' },
  { name: 'Golden sweet corn', category: 'Vegetables', price: 25, unit: 'piece', quantity: 50, farmerName: 'Sanjay Organic Farm', location: 'Panagarh, WB', description: 'Sweet kernels, perfect for a quick snack.', emoji: '🌽', tone: 'corn', tag: 'FARM FAVOURITE' },
  { name: 'Naturally sweet bananas', category: 'Fruits', price: 42, unit: 'dozen', quantity: 22, farmerName: 'Anand Family Orchard', location: 'Bankura, WB', description: 'Naturally ripened bananas for the family.', emoji: '🍌', tone: 'banana', tag: 'GREAT VALUE' },
  { name: 'Whole wheat atta', category: 'Grains', price: 48, unit: 'kg', quantity: 65, farmerName: 'Mitra Grain Collective', location: 'Birbhum, WB', description: 'Locally milled whole wheat flour.', emoji: '🌾', tone: 'grain', tag: 'LOCAL GRAIN' },
  { name: 'Fresh farm carrots', category: 'Vegetables', price: 35, unit: 'kg', quantity: 27, farmerName: 'Rina Family Farm', location: 'Durgapur, WB', description: 'Crunchy carrots with a naturally sweet taste.', emoji: '🥕', tone: 'carrot', tag: 'FRESH PICK' },
  { name: 'Farm-fresh milk', category: 'Dairy', price: 32, unit: 'litre', quantity: 16, farmerName: 'Green Meadow Dairy', location: 'Andal, WB', description: 'Fresh local dairy listing. Keep refrigerated.', emoji: '🥛', tone: 'milk', tag: 'LOCAL DAIRY' }
];

function databaseReady(res) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database is not connected. Check MONGODB_URI in your .env file.' });
    return false;
  }
  return true;
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    farmName: user.farmName || '',
    location: user.location || ''
  };
}

function publicProduct(product) {
  return {
    id: String(product._id),
    name: product.name,
    category: product.category,
    price: product.price,
    unit: product.unit,
    quantity: product.quantity,
    farmer: product.farmerName,
    location: product.location,
    description: product.description,
    emoji: product.emoji,
    tone: product.tone,
    tag: product.tag,
    imageUrl: product.imageUrl || '',
    isSample: Boolean(product.isSample),
    createdAt: product.createdAt ? new Date(product.createdAt).getTime() : Date.now()
  };
}

function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short. Set a random value of at least 32 characters in .env.');
  }
  return jwt.sign({ sub: String(user._id), role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

// Health endpoint lets you check the server and database separately.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'KisanDirect API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// -------------------- Authentication --------------------
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    if (!databaseReady(res)) return;
    const { name, email, password, role = 'buyer', phone = '', farmName = '', location = '' } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!String(name || '').trim() || String(name).trim().length > 80) {
      return res.status(400).json({ message: 'Please enter your name (maximum 80 characters).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'Password must be 8 to 72 characters long.' });
    }
    if (!['buyer', 'farmer'].includes(role)) {
      return res.status(400).json({ message: 'Choose either buyer or farmer account type.' });
    }
    if (role === 'farmer' && (!String(farmName).trim() || !String(location).trim())) {
      return res.status(400).json({ message: 'Farm name and farm location are required for farmer accounts.' });
    }

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      phone: String(phone || '').trim().slice(0, 20),
      farmName: role === 'farmer' ? String(farmName).trim() : '',
      location: role === 'farmer' ? String(location).trim() : ''
    });

    const token = createToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    if (!databaseReady(res)) return;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// -------------------- Products --------------------
app.get('/api/products', async (req, res, next) => {
  try {
    if (!databaseReady(res)) return;
    const filter = {};
    if (['Vegetables', 'Fruits', 'Grains', 'Dairy'].includes(req.query.category)) filter.category = req.query.category;
    const products = await Product.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    res.json({ products: products.map(publicProduct) });
  } catch (error) { next(error); }
});

app.post('/api/products', requireAuth, requireFarmer, async (req, res, next) => {
  try {
    if (!databaseReady(res)) return;
    const { name, category, price, unit = 'kg', quantity, description = '', emoji = '🌱', tone = 'custom', imageUrl = '' } = req.body || {};
    const cleanName = String(name || '').trim();
    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    const validUnits = ['kg', 'bunch', 'piece', 'dozen', 'litre', 'bag'];
    const validCategories = ['Vegetables', 'Fruits', 'Grains', 'Dairy'];
    if (!cleanName || cleanName.length > 70) return res.status(400).json({ message: 'Produce name is required (maximum 70 characters).' });
    if (!validCategories.includes(category)) return res.status(400).json({ message: 'Choose a valid produce category.' });
    if (!Number.isFinite(numericPrice) || numericPrice < 0.5 || numericPrice > 100000) return res.status(400).json({ message: 'Enter a valid price.' });
    if (!Number.isInteger(numericQuantity) || numericQuantity < 1 || numericQuantity > 100000) return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 100000.' });
    if (!validUnits.includes(unit)) return res.status(400).json({ message: 'Choose a valid unit.' });
    if (imageUrl && (typeof imageUrl !== 'string' || !/^https:\/\//i.test(imageUrl) || imageUrl.length > 1000)) {
      return res.status(400).json({ message: 'Image URL must be a valid HTTPS URL.' });
    }

    const product = await Product.create({
      name: cleanName,
      category,
      price: numericPrice,
      unit,
      quantity: numericQuantity,
      farmerName: req.user.farmName || req.user.name,
      location: req.user.location || 'Location not provided',
      description: String(description || '').trim().slice(0, 300),
      emoji: String(emoji || '🌱').slice(0, 12),
      tone: String(tone || 'custom').slice(0, 24),
      tag: 'NEW LISTING',
      imageUrl: imageUrl || '',
      createdBy: req.user._id,
      isSample: false
    });
    res.status(201).json({ product: publicProduct(product) });
  } catch (error) { next(error); }
});

app.delete('/api/products/:id', requireAuth, async (req, res, next) => {
  try {
    if (!databaseReady(res)) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (!product.createdBy || String(product.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only remove listings created by your account.' });
    }
    await product.deleteOne();
    res.json({ message: 'Listing removed.' });
  } catch (error) { next(error); }
});

// -------------------- Optional Cloudinary image upload --------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return callback(new Error('Only JPG, PNG and WEBP images are accepted.'));
    }
    callback(null, true);
  }
});

app.post('/api/uploads/image', requireAuth, requireFarmer, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose an image to upload.' });
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(503).json({ message: 'Image hosting is not configured. Add Cloudinary credentials to .env, or publish without a photo.' });
    }
    cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'kisandirect/products',
      resource_type: 'image'
    });
    res.status(201).json({ imageUrl: result.secure_url });
  } catch (error) { next(error); }
});

// -------------------- Demo checkout and order history --------------------
app.post('/api/orders', requireAuth, async (req, res, next) => {
  const decremented = [];
  try {
    if (!databaseReady(res)) return;
    const { items, deliveryAddress } = req.body || {};
    const address = String(deliveryAddress || '').trim();
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res.status(400).json({ message: 'Your basket must contain between 1 and 20 different products.' });
    }
    if (address.length < 8 || address.length > 500) return res.status(400).json({ message: 'Please enter a delivery address (8 to 500 characters).' });

    const unique = new Set();
    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const productId = String(item?.productId || '');
      const quantity = Number(item?.quantity);
      if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || unique.has(productId)) {
        throw Object.assign(new Error('One of the basket items is invalid. Refresh the marketplace and try again.'), { status: 400 });
      }
      unique.add(productId);
      const product = await Product.findOneAndUpdate(
        { _id: productId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true }
      );
      if (!product) throw Object.assign(new Error('A product is unavailable or no longer has enough stock. Refresh your basket and try again.'), { status: 409 });
      decremented.push({ productId, quantity });
      const unitPrice = Number(product.price);
      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
      total += lineTotal;
      orderItems.push({
        product: product._id,
        productName: product.name,
        farmer: product.createdBy || null,
        farmerName: product.farmerName,
        quantity,
        unit: product.unit,
        unitPrice,
        lineTotal
      });
    }

    const order = await Order.create({
      orderNumber: `KD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      buyer: req.user._id,
      buyerName: req.user.name,
      buyerEmail: req.user.email,
      deliveryAddress: address,
      items: orderItems,
      total: Math.round(total * 100) / 100,
      paymentMethod: 'demo',
      paymentStatus: 'demo_simulated',
      status: 'placed'
    });

    res.status(201).json({
      message: 'Demo order saved. No real payment was collected.',
      order: {
        id: String(order._id),
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    // Restore stock if a later item or order creation fails.
    await Promise.all(decremented.map((entry) => Product.updateOne({ _id: entry.productId }, { $inc: { quantity: entry.quantity } }).catch(() => null)));
    next(error);
  }
});

app.get('/api/orders/mine', requireAuth, async (req, res, next) => {
  try {
    if (!databaseReady(res)) return;
    let query = { buyer: req.user._id };
    if (req.user.role === 'farmer') query = { $or: [{ buyer: req.user._id }, { 'items.farmer': req.user._id }] };
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(50).lean();
    const mapped = orders.map((order) => {
      const visibleItems = req.user.role === 'farmer' && String(order.buyer) !== String(req.user._id)
        ? order.items.filter((item) => String(item.farmer) === String(req.user._id))
        : order.items;
      const visibleTotal = visibleItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
      return {
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        items: visibleItems.map((item) => ({ productName: item.productName, farmerName: item.farmerName, quantity: item.quantity, unit: item.unit, lineTotal: item.lineTotal })),
        total: req.user.role === 'farmer' && String(order.buyer) !== String(req.user._id) ? visibleTotal : order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      };
    });
    res.json({ orders: mapped });
  } catch (error) { next(error); }
});

// -------------------- Free public-data integrations --------------------
app.get('/api/external/weather', async (req, res, next) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Provide valid latitude and longitude values.' });
    }
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
      timezone: 'auto'
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return res.status(502).json({ message: 'Weather provider is temporarily unavailable.' });
    res.json(await response.json());
  } catch (error) { next(error); }
});

app.get('/api/external/mandi-prices', async (_req, res, next) => {
  try {
    const apiKey = process.env.DATA_GOV_IN_API_KEY;
    const resourceId = process.env.DATA_GOV_IN_RESOURCE_ID;
    if (!apiKey || !resourceId) {
      return res.status(503).json({ message: 'Mandi price API is optional. Set DATA_GOV_IN_API_KEY and DATA_GOV_IN_RESOURCE_ID in .env.' });
    }
    const url = new URL(`https://api.data.gov.in/resource/${encodeURIComponent(resourceId)}`);
    url.search = new URLSearchParams({ 'api-key': apiKey, format: 'json', limit: '50' }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return res.status(502).json({ message: 'Mandi data provider is temporarily unavailable.' });
    res.json(await response.json());
  } catch (error) { next(error); }
});

// Static site fallback.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = Number(error.status || error.statusCode) || 500;
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid database ID.' });
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Image must be 5 MB or smaller.' });
  if (error.name === 'MulterError') return res.status(400).json({ message: error.message });
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on the server. Check the terminal logs.' : error.message });
});

async function seedSampleListings() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(sampleProducts.map((item) => ({ ...item, isSample: true })));
    console.log(`Inserted ${sampleProducts.length} sample marketplace listings.`);
  }
}

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not set. The website will open, but shared accounts, listings and orders need MongoDB.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB.');
    await seedSampleListings();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('Check MONGODB_URI, Atlas network access and database username/password.');
  }
}

app.listen(PORT, () => {
  console.log(`KisanDirect is running at http://localhost:${PORT}`);
  connectDatabase();
});
