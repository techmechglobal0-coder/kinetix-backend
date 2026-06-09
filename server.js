const express = require('express');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/products');
const contactRoutes = require('./routes/contactRoutes');
const bulkOrderRoutes = require('./routes/bulkOrderRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());
const PORT = process.env.PORT;
// Middleware
app.use('/uploads', express.static('uploads'));
app.use(express.json()); 
app.use('/api/auth', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/bulk-orders', bulkOrderRoutes);
app.use('/api/orders', orderRoutes);
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});