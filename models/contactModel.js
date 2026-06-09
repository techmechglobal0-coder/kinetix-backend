const pool = require('../db');

class ContactModel {
    // Create a new contact message
    static async create(data) {
        const { name, email, interested_in, message } = data;
        const [result] = await pool.query(
            `INSERT INTO querys (name, email, interested_in, message)
             VALUES (?, ?, ?, ?)`,
            [name, email, interested_in || null, message]
        );
        return { id: result.insertId, name, email, interested_in, message };
    }

    // Delete a message by id
    static async delete(id) {
        const [result] = await pool.query('DELETE FROM querys WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async getAll() {
    const [rows] = await pool.query(`
        SELECT * FROM querys
        ORDER BY created_at DESC
    `);
    return rows;
}
}


module.exports = ContactModel;