const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authenticateToken = require('../middleware/auth');
router.post('/', contactController.createContact);
router.delete('/:id', authenticateToken, contactController.deleteContact);
router.get('/', authenticateToken, contactController.getAllContacts);
module.exports = router;