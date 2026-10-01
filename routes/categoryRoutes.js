const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
// Public routes (add JWT middleware if needed)
router.post('/', authenticateToken, upload.single('image'), categoryController.createCategory);
router.get('/', categoryController.getAllCategories);
router.get('/:id', authenticateToken, categoryController.getCategoryById);
router.put('/:id', authenticateToken, upload.single('image'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, categoryController.deleteCategory);
module.exports = router;