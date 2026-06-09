const db = require('../db'); // your MySQL connection pool

// Total Orders
exports.getTotalOrders = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM orders');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch total orders' });
  }
};

// Completed Orders
exports.getCompletedOrders = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM orders WHERE order_complete = 1');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch completed orders' });
  }
};

// Pending Orders
exports.getPendingOrders = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM orders WHERE order_complete = 0');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
};

// Total Business (sum of completed order totals)
exports.getTotalBusiness = async (req, res) => {
  try {
    // Sum of (quantity * unit_price) for completed orders
    const [rows] = await db.query(`
      SELECT SUM(oi.quantity * oi.unit_price) AS total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.order_complete = 1
    `);
    const amount = rows[0].total || 0;
    res.json({ amount: parseFloat(amount) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch total business' });
  }
};
// totalCategories
exports.getTotalCategories = async (req, res) => {
  const [rows] = await db.query('SELECT COUNT(*) AS count FROM categories');
  res.json({ count: rows[0].count });
};

// totalProducts
exports.getTotalProducts = async (req, res) => {
  const [rows] = await db.query('SELECT COUNT(*) AS count FROM products');
  res.json({ count: rows[0].count });
};
// total queries
exports.getTotalquerys = async (req, res) => {
  const [rows] = await db.query('SELECT COUNT(*) AS count FROM querys');
  res.json({ count: rows[0].count });
};

// total bulk orders
exports.getTotalbulk_orders = async (req, res) => {
  const [rows] = await db.query('SELECT COUNT(*) AS count FROM bulk_orders');
  res.json({ count: rows[0].count });
};