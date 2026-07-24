const pool = require('../db');

class ProductModel {
    // Helper to normalize in_stock to 'yes' or 'no'
    static normalizeInStock(value) {
        // Accepts boolean, 'true'/'false', 'yes'/'no', 1/0
        if (value === 'yes' || value === 'no') return value;
        if (value === true || value === 'true' || value === 1) return 'yes';
        return 'no'; // default
    }

    // Create new product
    static async create(productData) {
        const {
            category_id,
            title,
            price,
            description,
            technical_description,
            in_stock,
            images,
            tags
        } = productData;

        const normalizedInStock = this.normalizeInStock(in_stock);

        const [result] = await pool.query(
            `INSERT INTO products 
            (category_id, title, price, description, technical_description, in_stock, images, tags) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                category_id,
                title,
                price,
                description || null,
                technical_description || null,
                normalizedInStock,
                images ? JSON.stringify(images) : null,
                tags ? JSON.stringify(tags) : null
            ]
        );
        return this.findById(result.insertId);
    }

    // Get all products with category name (JOIN)
    static async findAll() {
        const [rows] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             ORDER BY p.id DESC`
        );
        return rows.map(row => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
            tags: row.tags ? JSON.parse(row.tags) : []
        }));
    }

    // Get single product by ID
    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );
        if (rows.length === 0) return null;
        const product = rows[0];
        return {
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            tags: product.tags ? JSON.parse(product.tags) : []
        };
    }

    // Update product
    static async update(id, productData) {
        const {
            category_id,
            title,
            price,
            description,
            technical_description,
            in_stock,
            images,
            tags
        } = productData;

        const normalizedInStock = in_stock !== undefined ? this.normalizeInStock(in_stock) : undefined;

        await pool.query(
            `UPDATE products SET 
                category_id = COALESCE(?, category_id),
                title = COALESCE(?, title),
                price = COALESCE(?, price),
                description = ?,
                technical_description = ?,
                in_stock = COALESCE(?, in_stock),
                images = ?,
                tags = ?
            WHERE id = ?`,
            [
                category_id,
                title,
                price,
                description,
                technical_description,
                normalizedInStock,
                images ? JSON.stringify(images) : null,
                tags ? JSON.stringify(tags) : null,
                id
            ]
        );
        return this.findById(id);
    }

    // Delete product (and its associated images from disk)
    static async delete(id) {
        const product = await this.findById(id);
        if (product && product.images && product.images.length) {
            const fs = require('fs');
            const path = require('path');
            product.images.forEach(imagePath => {
                const fullPath = path.join(__dirname, '..', imagePath);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            });
        }
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // Find by category
    static async findByCategory(category_id) {
        const [rows] = await pool.query(
            'SELECT * FROM products WHERE category_id = ? ORDER BY id DESC',
            [category_id]
        );
        return rows.map(row => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
            tags: row.tags ? JSON.parse(row.tags) : []
        }));
    }
}

module.exports = ProductModel;