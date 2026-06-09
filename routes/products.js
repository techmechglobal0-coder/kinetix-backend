const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/multiUploads');

// Routes
router.post('/',upload.array('images', 5),productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);
router.put('/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
module.exports = router;