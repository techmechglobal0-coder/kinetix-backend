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
// Never select the password hash for listing
async function findAll() {
    const [rows] = await pool.query('SELECT id, user_name FROM admin_login ORDER BY id ASC');
    return rows;
}
async function findById(id) {
    const [rows] = await pool.query('SELECT id, user_name FROM admin_login WHERE id = ?', [id]);
    return rows[0];
}
async function count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM admin_login');
    return rows[0].count;
}
async function updatePassword(id, hashedPassword) {
    const [result] = await pool.query('UPDATE admin_login SET password = ? WHERE id = ?', [hashedPassword, id]);
    return result.affectedRows > 0;
}
async function remove(id) {
    const [result] = await pool.query('DELETE FROM admin_login WHERE id = ?', [id]);
    return result.affectedRows > 0;
}
module.exports = { findByUsername, create, findAll, findById, count, updatePassword, remove };
