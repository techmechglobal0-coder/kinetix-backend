const CategoryModel = require('../models/categoryModel');

// Helper to delete old image file (optional)
const fs = require('fs');
const path = require('path');

const deleteOldImage = (imagePath) => {
    if (imagePath && imagePath.startsWith('/uploads/')) {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
};

// CREATE category (with optional image file)
const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }
        // If file uploaded, store its path; otherwise use existing image field from body or null
        let image = req.body.thumbnail; // could be URL string from form-data
        if (req.file) {
            image = `/uploads/categories/${req.file.filename}`;
        }
        const newCategory = await CategoryModel.create({ name, description, image });
        res.status(201).json({
            message: 'Category created successfully',
            category: newCategory
        });
    } catch (err) {
        // If duplicate entry error
        if (err.code === 'ER_DUP_ENTRY') {
            // Clean up uploaded file if exists to avoid orphan files
            if (req.file) {
                const filePath = path.join(__dirname, '..', 'uploads', 'categories', req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            return res.status(409).json({ message: 'Category name already exists' });
        }
        next(err);
    }
};

// GET all categories
const getAllCategories = async (req, res, next) => {
    try {
        const categories = await CategoryModel.findAll();
        res.json({data: categories, total: categories.length});
    } catch (err) {
        next(err);
    }
};

// GET single category by ID
const getCategoryById = async (req, res, next) => {
    try {
        const category = await CategoryModel.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (err) {
        next(err);
    }
};

// UPDATE category (with optional new image)
const updateCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.id;
        const { name, description } = req.body;

        // Fetch existing category to possibly delete old image
        const existingCategory = await CategoryModel.findById(categoryId);
        if (!existingCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        let image = existingCategory.image; // keep old image by default

        // If new file uploaded, replace image path
        if (req.file) {
            image = `/uploads/categories/${req.file.filename}`;
            // Delete old image file if exists and is a local file (not external URL)
            if (existingCategory.image && existingCategory.image.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, '..', existingCategory.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } else if (req.body.image !== undefined) {
            // Allow updating image URL from JSON body if no file
            image = req.body.image;
        }

        const updatedCategory = await CategoryModel.update(categoryId, { name, description, image });
        res.json({ message: 'Category updated successfully', category: updatedCategory });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Category name already exists' });
        }
        next(err);
    }
};

// DELETE category
const deleteCategory = async (req, res, next) => {
    try {
        const category = await CategoryModel.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Delete associated image file if it's a local file
        if (category.image && category.image.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', category.image);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        const deleted = await CategoryModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};