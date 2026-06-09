// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/adminController');
const { register } = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');
router.post('/login', login);
router.post('/register', register);
router.get('/total-orders', dashboardController.getTotalOrders);
router.get('/completed-orders', dashboardController.getCompletedOrders);
router.get('/pending-orders', dashboardController.getPendingOrders);
router.get('/total-business', dashboardController.getTotalBusiness);
router.get('/total-categoies', dashboardController.getTotalCategories);
router.get('/total-products', dashboardController.getTotalProducts);
router.get('/total-bulkOrders', dashboardController.getTotalbulk_orders);
router.get('/total-queries', dashboardController.getTotalquerys);
module.exports = router;