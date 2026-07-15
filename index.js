const express = require('express');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

// ─── 1. MANUAL CORS MIDDLEWARE (NO external package needed) ──
app.use((req, res, next) => {
  // Dynamically set origin to match the request (or hardcode it)
  const allowedOrigins = ['https://kinetixpk.com', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── 2. ROUTES ──────────────────────────────────────────────
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/products');
const contactRoutes = require('./routes/contactRoutes');
const bulkOrderRoutes = require('./routes/bulkOrderRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/auth', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/bulk-orders', bulkOrderRoutes);
app.use('/api/orders', orderRoutes);

// ─── 3. HEALTH CHECK ──────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).send('Server running 🚀');
});

// ─── 4. TEST ROUTE ──────────────────────────────────────
app.get('/api/test-cors', (req, res) => {
  res.json({ message: 'CORS is working perfectly!' });
});

// ─── 5. ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── 6. START SERVER ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});