const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
router.post('/', contactController.createContact);
router.delete('/:id', contactController.deleteContact);
router.get('/', contactController.getAllContacts);
module.exports = router;