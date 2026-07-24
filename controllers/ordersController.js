const OrderModel = require('../models/orderModel');
const { sendOrderConfirmation } = require('../config/email'); // adjust path
const OrderController = {
    // CREATE
    async createOrder(req, res) {
        try {
            const { name, address, phone, city, postal_code, email, items } = req.body; // ✅ added email
            let orderItems;
            try {
                orderItems = typeof items === 'string' ? JSON.parse(items) : items;
                if (!Array.isArray(orderItems)) throw new Error();
            } catch (e) {
                return res.status(400).json({ error: 'Invalid items format' });
            }
            const paymentPath = req.file ? req.file.path : null;

            const orderId = await OrderModel.createOrder(
                { name, address, phone, city, postal_code, email }, // ✅ pass email
                orderItems,
                paymentPath
            );
            // Fetch the full order with items to send email
            const fullOrder = await OrderModel.getOrderById(orderId); // you need this method
            sendOrderConfirmation(fullOrder, fullOrder.items).catch(err =>
                console.error('Background email error:', err)
            );
            res.status(201).json({ message: 'Order created', orderId });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create order' });
        }
    },

    // READ ALL
    async getAllOrders(req, res) {
        try {
            const orders = await OrderModel.getAllOrders();
            res.json(orders);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    },

    // READ ONE
    async getOrderById(req, res) {
        const orderId = req.params.id;
        try {
            const order = await OrderModel.getOrderById(orderId);
            if (!order) return res.status(404).json({ error: 'Order not found' });
            res.json(order);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch order' });
        }
    },

    // UPDATE
    async updateOrder(req, res) {
        const orderId = req.params.id;
        try {
            const { name, address, phone, city, postal_code, items, order_complete } = req.body;
            let orderItems;
            if (items) {
                try {
                    orderItems = typeof items === 'string' ? JSON.parse(items) : items;
                    if (!Array.isArray(orderItems)) throw new Error();
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid items format' });
                }
            }
            const paymentPath = req.file ? req.file.path : null;

            const updated = await OrderModel.updateOrder(
                orderId,
                { name, address, phone, city, postal_code, order_complete },
                orderItems,
                paymentPath
            );

            if (!updated) return res.status(404).json({ error: 'Order not found' });
            res.json({ message: 'Order updated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Update failed' });
        }
    },

    // DELETE
    async deleteOrder(req, res) {
        const orderId = req.params.id;
        try {
            const deleted = await OrderModel.deleteOrder(orderId);
            if (!deleted) return res.status(404).json({ error: 'Order not found' });
            res.json({ message: 'Order deleted successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Delete failed' });
        }
    },

    // MARK COMPLETE
    async completeOrder(req, res) {
        const orderId = req.params.id;
        try {
            const completed = await OrderModel.completeOrder(orderId);
            if (!completed) return res.status(404).json({ error: 'Order not found or already completed' });
            res.json({ message: 'Order marked as complete' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to mark complete' });
        }
    }
};

module.exports = OrderController;