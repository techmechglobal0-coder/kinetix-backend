const pool = require('../db');

class CategoryModel {
    static async create(categoryData) {
        const { name, description, image } = categoryData;
        const [result] = await pool.query(
            'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
            [name, description, image || null]
        );
        return { id: result.insertId, name, description, image };
    }

    static async findAll() {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY id DESC');
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
        return rows[0];
    }

    static async update(id, categoryData) {
        const { name, description, image } = categoryData;
        await pool.query(
            'UPDATE categories SET name = ?, description = ?, image = ? WHERE id = ?',
            [name, description, image, id]
        );
        return this.findById(id);
    }

    static async delete(id) {
        const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = CategoryModel;