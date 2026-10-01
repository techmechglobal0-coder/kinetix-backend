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
            { id: user.id, username: user.username || user.email },
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
    console.log(req.body);
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create(username, hashedPassword);
        if (newUser)
            res.status(200).json({ message: "New Admin Created" })
    } catch (err) { next(err); }
};
module.exports = { login, register }