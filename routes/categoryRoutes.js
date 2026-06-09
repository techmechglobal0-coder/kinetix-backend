const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
// Protect routes with JWT middleware if needed (optional)
// const verifyToken = require('../middleware/authMiddleware');
// router.use(verifyToken);
const upload = require('../middleware/upload');
// Public routes (add JWT middleware if needed)
router.post('/', upload.single('image'), categoryController.createCategory);
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', upload.single('image'), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
module.exports = router;