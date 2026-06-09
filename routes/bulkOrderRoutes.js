const express = require('express');
const router = express.Router();
const bulkOrderController = require('../controllers/bulkOrderController');
router.post('/', bulkOrderController.createBulkOrder);
router.get('/', bulkOrderController.getAllBulkOrders);
router.delete('/:id', bulkOrderController.deleteBulkOrder);
module.exports = router;