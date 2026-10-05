const jwt = require('jsonwebtoken');

// No hard-coded fallback: a default secret is public (it's in the repo), so
// anyone could sign their own admin token with it. Login already needs
// JWT_SECRET to issue tokens, so verification uses the same one.
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    // Get the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    // Every route that uses this middleware is admin-only (orders, contacts,
    // bulk orders, dashboard stats), so GET requests need a token as well.
    // Public GET routes (products, categories, geo) don't use this middleware.
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request (e.g., { id, role, ... })
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = authenticateToken;
