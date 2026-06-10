const express = require('express');
const router = express.Router();
const bulkOrderController = require('../controllers/bulkOrderController');
const authenticateToken = require('../middleware/auth');
router.post('/', bulkOrderController.createBulkOrder);
router.get('/', authenticateToken, bulkOrderController.getAllBulkOrders);
router.delete('/:id', authenticateToken, bulkOrderController.deleteBulkOrder);
module.exports = router;