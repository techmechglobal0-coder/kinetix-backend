const pool = require('../db');

class BulkOrderModel {
    // Create a new bulk order
    static async create(data) {
        const {
            institution_name,
            contact_person,
            work_email,
            expected_quantity,
            specific_product_interests,
            project_details
        } = data;

        const [result] = await pool.query(
            `INSERT INTO bulk_orders 
            (institution_name, contact_person, work_email, expected_quantity, specific_product_interests, project_details)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                institution_name,
                contact_person,
                work_email,
                expected_quantity || null,
                specific_product_interests || null,
                project_details || null
            ]
        );
        return { id: result.insertId, ...data };
    }

    // Get all bulk orders (most recent first)
    static async getAll() {
        const [rows] = await pool.query(`
            SELECT * FROM bulk_orders
            ORDER BY created_at DESC
        `);
        return rows;
    }

    // Get a single bulk order by ID
    static async getById(id) {
        const [rows] = await pool.query(
            `SELECT * FROM bulk_orders WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    // Delete a bulk order by ID
    static async delete(id) {
        const [result] = await pool.query('DELETE FROM bulk_orders WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = BulkOrderModel;