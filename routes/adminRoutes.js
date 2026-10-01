// routes/authRoutes.js
const express = require('express');
const authenticateToken = require('../middleware/auth');
const router = express.Router();
const { login } = require('../controllers/adminController');
const { register } = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');
router.post('/login', login);
router.post('/register', register);
router.get('/total-orders',authenticateToken,dashboardController.getTotalOrders);
router.get('/completed-orders',authenticateToken, dashboardController.getCompletedOrders);
router.get('/pending-orders',authenticateToken, dashboardController.getPendingOrders);
router.get('/total-business',authenticateToken, dashboardController.getTotalBusiness);
router.get('/total-categoies',authenticateToken, dashboardController.getTotalCategories);
router.get('/total-products',authenticateToken, dashboardController.getTotalProducts);
router.get('/total-bulkOrders',authenticateToken, dashboardController.getTotalbulk_orders);
router.get('/total-queries',authenticateToken, dashboardController.getTotalquerys);
module.exports = router;