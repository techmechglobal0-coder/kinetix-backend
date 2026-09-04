const pool = require('../db');

class ProductModel {
    // Helper to normalize in_stock to 'yes' or 'no'
    static normalizeInStock(value) {
        // Accepts boolean, 'true'/'false', 'yes'/'no', 1/0
        if (value === 'yes' || value === 'no') return value;
        if (value === true || value === 'true' || value === 1) return 'yes';
        return 'no'; // default
    }

    // images, tags and variants are JSON held in TEXT columns. mysql2 returns a
    // string for those, but an already-parsed value if the column is ever
    // migrated to a real JSON type, so accept both and never throw on bad data.
    static parseJsonColumn(value, fallback = []) {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value !== 'string') return value;
        try {
            const parsed = JSON.parse(value);
            return parsed === null ? fallback : parsed;
        } catch (err) {
            return fallback;
        }
    }

    // Money columns are optional: an empty string, null, or a non-number all
    // mean 'not set' rather than zero, so a blank field never prices at 0.
    static toNullableAmount(value) {
        if (value === null || value === undefined || value === '') return null;
        const amount = Number(value);
        return Number.isFinite(amount) && amount >= 0 ? amount : null;
    }

    // Product options such as 'Standard Quality' or 'Large', each with its own
    // price. Entries without a name or a usable price are dropped so the shop
    // never renders a blank option or a NaN price.
    static normalizeVariants(variants) {
        const list = typeof variants === 'string' ? this.parseJsonColumn(variants) : variants;
        if (!Array.isArray(list)) return [];
        return list
            .map(variant => ({
                name: String(variant && variant.name ? variant.name : '').trim(),
                price: Number(variant && variant.price),
                // NULL when the admin has not set one; the storefront then shows
                // this option in PKR even to international visitors
                price_usd: ProductModel.toNullableAmount(variant && variant.price_usd),
                in_stock: this.normalizeInStock(variant && variant.in_stock !== undefined ? variant.in_stock : 'yes')
            }))
            .filter(variant => variant.name !== '' && Number.isFinite(variant.price) && variant.price >= 0);
    }

    // Shape a raw DB row into the product the API returns
    static mapRow(row) {
        return {
            ...row,
            price_usd: this.toNullableAmount(row.price_usd),
            shipping_pkr: this.toNullableAmount(row.shipping_pkr),
            shipping_usd: this.toNullableAmount(row.shipping_usd),
            images: this.parseJsonColumn(row.images),
            tags: this.parseJsonColumn(row.tags),
            variants: this.normalizeVariants(row.variants)
        };
    }

    // Create new product
    static async create(productData) {
        const {
            category_id,
            title,
            price,
            price_usd,
            shipping_pkr,
            shipping_usd,
            description,
            technical_description,
            in_stock,
            images,
            tags,
            variants
        } = productData;

        const normalizedInStock = this.normalizeInStock(in_stock);
        const normalizedVariants = this.normalizeVariants(variants);

        const [result] = await pool.query(
            `INSERT INTO products 
            (category_id, title, price, price_usd, shipping_pkr, shipping_usd, description, technical_description, in_stock, images, tags, variants) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                category_id,
                title,
                price,
                this.toNullableAmount(price_usd),
                this.toNullableAmount(shipping_pkr),
                this.toNullableAmount(shipping_usd),
                description || null,
                technical_description || null,
                normalizedInStock,
                images ? JSON.stringify(images) : null,
                tags ? JSON.stringify(tags) : null,
                normalizedVariants.length ? JSON.stringify(normalizedVariants) : null
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
        return rows.map(row => this.mapRow(row));
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
        return this.mapRow(rows[0]);
    }

    // Update product
    static async update(id, productData) {
        const {
            category_id,
            title,
            price,
            price_usd,
            shipping_pkr,
            shipping_usd,
            description,
            technical_description,
            in_stock,
            images,
            tags,
            variants
        } = productData;

        const normalizedInStock = in_stock !== undefined ? this.normalizeInStock(in_stock) : undefined;
        const normalizedVariants = this.normalizeVariants(variants);

        await pool.query(
            `UPDATE products SET 
                category_id = COALESCE(?, category_id),
                title = COALESCE(?, title),
                price = COALESCE(?, price),
                price_usd = ?,
                shipping_pkr = ?,
                shipping_usd = ?,
                description = ?,
                technical_description = ?,
                in_stock = COALESCE(?, in_stock),
                images = ?,
                tags = ?,
                variants = ?
            WHERE id = ?`,
            [
                category_id,
                title,
                price,
                this.toNullableAmount(price_usd),
                this.toNullableAmount(shipping_pkr),
                this.toNullableAmount(shipping_usd),
                description,
                technical_description,
                normalizedInStock,
                images ? JSON.stringify(images) : null,
                tags ? JSON.stringify(tags) : null,
                normalizedVariants.length ? JSON.stringify(normalizedVariants) : null,
                id
            ]
        );
        return this.findById(id);
    }

    // Delete product, then its images from disk
    static async delete(id) {
        const product = await this.findById(id);
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
        if (result.affectedRows === 0) return false;

        // Files go only after the row is gone. Removing them first would leave
        // a live product pointing at missing images if the delete failed.
        if (product && Array.isArray(product.images)) {
            const fs = require('fs');
            const path = require('path');
            product.images.forEach(imagePath => {
                // Guard the prefix so a tampered images value cannot walk the disk
                if (typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/products/')) return;
                const fullPath = path.join(__dirname, '..', imagePath);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            });
        }
        return true;
    }

    // Find by category
    static async findByCategory(category_id) {
        const [rows] = await pool.query(
            'SELECT * FROM products WHERE category_id = ? ORDER BY id DESC',
            [category_id]
        );
        return rows.map(row => this.mapRow(row));
    }
}

module.exports = ProductModel;
