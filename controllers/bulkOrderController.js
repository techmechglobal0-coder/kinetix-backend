const BulkOrderModel = require('../models/bulkOrderModel');

// POST /api/bulk-orders
const createBulkOrder = async (req, res, next) => {
    try {
        const {
            institution_name,
            contact_person,
            work_email,
            expected_quantity,
            specific_product_interests,
            project_details
        } = req.body;

        // Validation
        if (!institution_name || !contact_person || !work_email) {
            return res.status(400).json({
                message: 'Institution name, contact person, and work email are required'
            });
        }

        const newOrder = await BulkOrderModel.create({
            institution_name,
            contact_person,
            work_email,
            expected_quantity,
            specific_product_interests,
            project_details
        });

        res.status(201).json({
            message: 'Bulk order request submitted successfully',
            order: newOrder
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/bulk-orders/:id
const deleteBulkOrder = async (req, res, next) => {
    try {
        const deleted = await BulkOrderModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Bulk order not found' });
        }
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// GET /api/bulk-orders
const getAllBulkOrders = async (req, res, next) => {
    try {
        const orders = await BulkOrderModel.getAll();
        res.status(200).json(orders);
    } catch (err) {
        next(err);
    }
};

// GET /api/bulk-orders/:id
const getBulkOrderById = async (req, res, next) => {
    try {
        const order = await BulkOrderModel.getById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Bulk order not found' });
        }
        res.status(200).json(order);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createBulkOrder,
    deleteBulkOrder,
    getAllBulkOrders
};