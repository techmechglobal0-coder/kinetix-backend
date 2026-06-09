const ContactModel = require('../models/contactModel');

// POST /api/contacts
const createContact = async (req, res, next) => {
    try {
        const { name, email, interested_in, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email and message are required' });
        }
        const newMessage = await ContactModel.create({ name, email, interested_in, message });
        res.status(201).json({
            message: 'Contact message sent successfully',
            contact: newMessage
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/contacts/:id
const deleteContact = async (req, res, next) => {
    try {
        const deleted = await ContactModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Message not found' });
        }
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const getAllContacts = async (req, res, next) => {
    try {
        const contacts = await ContactModel.getAll();
        res.status(200).json(contacts);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createContact,
    deleteContact,
    getAllContacts
};