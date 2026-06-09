const ProductModel = require('../models/products');
const fs = require('fs');
const path = require('path');

// Helper to delete old images when updating
const deleteImageFiles = (imagePaths) => {
    if (!imagePaths || !Array.isArray(imagePaths)) return;
    imagePaths.forEach(imagePath => {
        if (imagePath && imagePath.startsWith('/uploads/products/')) {
            const fullPath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
    });
};

// CREATE product (with multiple images)
const createProduct = async (req, res, next) => {
    try {
        const {
            category_id,
            title,
            price,
            description,
            technical_description,
            in_stock,
            tags
        } = req.body;

        // Validation
        if (!category_id || !title || !price) {
            return res.status(400).json({ message: 'category_id, title, and price are required' });
        }

        // Handle multiple uploaded images
        let imagePaths = [];
        if (req.files && req.files.length) {
            imagePaths = req.files.map(file => `/uploads/products/${file.filename}`);
        }

        // Parse tags if sent as JSON string
        let parsedTags = null;
        if (tags) {
            try {
                parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
                parsedTags = [tags];
            }
        }

        const newProduct = await ProductModel.create({
            category_id,
            title,
            price,
            description,
            technical_description,
            in_stock,
            images: imagePaths,
            tags: parsedTags
        });

        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (err) {
        // If error, clean up uploaded files
        if (req.files) {
            req.files.forEach(file => {
                const filePath = path.join(__dirname, '..', 'uploads', 'products', file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        }
        next(err);
    }
};

// GET all products
const getAllProducts = async (req, res, next) => {
    try {
        const products = await ProductModel.findAll();
        res.json({
            products: products,
            count: products.length
        });
    } catch (err) {
        next(err);
    }
};

// GET product by ID
const getProductById = async (req, res, next) => {
    try {
        const product = await ProductModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        next(err);
    }
};

// UPDATE product
const updateProduct = async (req, res, next) => {
    try {
        const productId = req.params.id;
        const existingProduct = await ProductModel.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const {
            category_id,
            title,
            price,
            description,
            technical_description,
            in_stock,
            tags,
            removeImages  // optional: array of image URLs to remove
        } = req.body;

        // Determine which images to keep
        let currentImages = existingProduct.images || [];

        // Remove specified images if requested
        if (removeImages) {
            let toRemove = typeof removeImages === 'string' ? JSON.parse(removeImages) : removeImages;
            if (Array.isArray(toRemove)) {
                // Delete files from disk
                deleteImageFiles(toRemove);
                // Filter out removed images
                currentImages = currentImages.filter(img => !toRemove.includes(img));
            }
        }

        // Handle newly uploaded images
        let newImages = [];
        if (req.files && req.files.length) {
            newImages = req.files.map(file => `/uploads/products/${file.filename}`);
        }

        const finalImages = [...currentImages, ...newImages];

        // Parse tags
        let parsedTags = existingProduct.tags;
        if (tags !== undefined) {
            try {
                parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
                parsedTags = [tags];
            }
        }

        const updatedProduct = await ProductModel.update(productId, {
            category_id,
            title,
            price,
            description,
            technical_description,
            in_stock,
            images: finalImages,
            tags: parsedTags
        });

        res.json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (err) {
        // Clean up newly uploaded files if error occurs
        if (req.files) {
            req.files.forEach(file => {
                const filePath = path.join(__dirname, '..', 'uploads', 'products', file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        }
        next(err);
    }
};

// DELETE product
const deleteProduct = async (req, res, next) => {
    try {
        const deleted = await ProductModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(204).json({ message: 'Product deleted' });
    } catch (err) {
        next(err);
    }
};

// GET products by category
const getProductsByCategory = async (req, res, next) => {
    try {
        const products = await ProductModel.findByCategory(req.params.categoryId);
        res.json(products);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductsByCategory
};