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

// Remove images multer already wrote to disk when the request cannot be completed
const cleanupUploadedFiles = (req) => {
    if (!req.files) return;
    req.files.forEach(file => {
        const filePath = path.join(__dirname, '..', 'uploads', 'products', file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
};

// Options such as 'Standard Quality' / 'Premium Quality', each with its own
// price. The dashboard posts them as a JSON string inside FormData.
const parseVariants = (variants) => {
    if (variants === undefined || variants === null || variants === '') return [];
    if (Array.isArray(variants)) return variants;
    return JSON.parse(variants); // caller turns a throw into a 400
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
            tags,
            variants,
            price_usd,
            shipping_pkr,
            shipping_usd
        } = req.body;

        // Validation
        if (!category_id || !title || !price) {
            cleanupUploadedFiles(req);
            return res.status(400).json({ message: 'category_id, title, and price are required' });
        }

        let parsedVariants;
        try {
            parsedVariants = parseVariants(variants);
        } catch (e) {
            cleanupUploadedFiles(req);
            return res.status(400).json({ message: 'Invalid variants format' });
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
            tags: parsedTags,
            variants: parsedVariants,
            price_usd,
            shipping_pkr,
            shipping_usd
        });

        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (err) {
        // If error, clean up uploaded files
        cleanupUploadedFiles(req);
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
            variants,
            price_usd,
            shipping_pkr,
            shipping_usd,
            removeImages  // optional: array of image URLs to remove
        } = req.body;

        let parsedVariants;
        try {
            parsedVariants = variants === undefined ? existingProduct.variants : parseVariants(variants);
        } catch (e) {
            cleanupUploadedFiles(req);
            return res.status(400).json({ message: 'Invalid variants format' });
        }

        const originalImages = existingProduct.images || [];
        let keptImages = originalImages;

        // Remove specified images if requested
        if (removeImages) {
            let toRemove = typeof removeImages === 'string' ? JSON.parse(removeImages) : removeImages;
            if (Array.isArray(toRemove)) {
                keptImages = keptImages.filter(img => !toRemove.includes(img));
            }
        }

        // Handle newly uploaded images
        let newImages = [];
        if (req.files && req.files.length) {
            newImages = req.files.map(file => `/uploads/products/${file.filename}`);
        }

        // Uploading new images replaces the existing set - which is exactly what
        // the dashboard tells the admin will happen. Without this they were
        // appended instead, so the product kept growing an image list nobody asked
        // for and the old files stayed on disk forever.
        const finalImages = newImages.length ? newImages : keptImages;
        const discardedImages = originalImages.filter(img => !finalImages.includes(img));

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
            tags: parsedTags,
            variants: parsedVariants,
            // an update that omits a money field leaves it as it was
            price_usd: price_usd !== undefined ? price_usd : existingProduct.price_usd,
            shipping_pkr: shipping_pkr !== undefined ? shipping_pkr : existingProduct.shipping_pkr,
            shipping_usd: shipping_usd !== undefined ? shipping_usd : existingProduct.shipping_usd
        });

        // Only once the row is safely updated: deleting first would leave the
        // product pointing at files that no longer exist if the update failed.
        deleteImageFiles(discardedImages);

        res.json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (err) {
        // Clean up newly uploaded files if error occurs
        cleanupUploadedFiles(req);
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