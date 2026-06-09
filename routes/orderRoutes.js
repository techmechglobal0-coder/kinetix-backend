const express = require('express');
const upload = require('../middleware/payment');
const OrderController = require('../controllers/ordersController');
const router = express.Router();
router.post('/', upload.single('payment_screen_short'), OrderController.createOrder);
router.get('/', OrderController.getAllOrders);
router.get('/:id', OrderController.getOrderById);
router.put('/:id', upload.single('payment_screen_short'), OrderController.updateOrder);
router.delete('/:id', OrderController.deleteOrder);
router.patch('/:id/complete', OrderController.completeOrder);

module.exports = router;