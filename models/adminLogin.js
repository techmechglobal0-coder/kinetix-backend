const pool = require('../db');
async function findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM admin_login WHERE user_name = ?', [username]);
    return rows[0];
}
async function create(username, password) {
    const [result] = await pool.query(
        'INSERT INTO admin_login (user_name,password) VALUES (?, ?)',
        [username, password]
    );
    // Return the inserted user (without password)
    const [rows] = await pool.query('SELECT id, user_name FROM admin_login WHERE id = ?', [result.insertId]);
    return rows[0];
}
module.exports = { findByUsername, create };