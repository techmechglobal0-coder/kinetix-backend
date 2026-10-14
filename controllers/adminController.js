// controllers/authController.js
const UserModel = require('../models/adminLogin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        // Find user by username/email
        const user = await UserModel.findByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Compare password with hashed password in DB
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.user_name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.user_name
            }
        });
    } catch (err) {
        next(err);
    }
};
const register = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        if (await UserModel.findByUsername(username)) {
            return res.status(409).json({ message: 'An admin with this username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create(username, hashedPassword);
        if (newUser)
            res.status(200).json({ message: "New Admin Created" })
    } catch (err) { next(err); }
};
const listAdmins = async (req, res, next) => {
    try {
        const admins = await UserModel.findAll();
        res.json({
            admins: admins.map(a => ({ ...a, is_current: req.user && Number(req.user.id) === Number(a.id) })),
            count: admins.length
        });
    } catch (err) { next(err); }
};
const updateAdminPassword = async (req, res, next) => {
    try {
        const { password } = req.body || {};
        if (!password || String(password).length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const admin = await UserModel.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        const hashedPassword = await bcrypt.hash(String(password), 10);
        await UserModel.updatePassword(admin.id, hashedPassword);
        res.json({ message: 'Password updated' });
    } catch (err) { next(err); }
};
const deleteAdmin = async (req, res, next) => {
    try {
        const admin = await UserModel.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        // Deleting yourself would end your session mid-action, and deleting the
        // last admin would lock everyone out of the dashboard for good.
        if (req.user && Number(req.user.id) === Number(admin.id)) {
            return res.status(400).json({ message: 'You cannot delete the account you are logged in with' });
        }
        if ((await UserModel.count()) <= 1) {
            return res.status(400).json({ message: 'At least one admin must remain' });
        }
        await UserModel.remove(admin.id);
        res.json({ message: 'Admin deleted' });
    } catch (err) { next(err); }
};
module.exports = { login, register, listAdmins, updateAdminPassword, deleteAdmin }