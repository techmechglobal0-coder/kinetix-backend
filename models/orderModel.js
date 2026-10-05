const db = require('../db');

const OrderModel = {
    // Create order and items (transaction)
    async createOrder(orderData, items, paymentPath) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { name, address, phone, city, postal_code, email, shipping_amount } = orderData;
            // Delivery is charged per product, so store what the customer was
            // shown rather than recomputing it later from the items alone.
            const shipping = Number.isFinite(Number(shipping_amount)) ? Number(shipping_amount) : 0;
            const [orderResult] = await connection.query(
                `INSERT INTO orders 
            (name, address, phone, city, postal_code, email, shipping_amount, payment_screen_short, order_complete)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, address, phone, city, postal_code, email, shipping, paymentPath, 0]
            );
            const orderId = orderResult.insertId;

            for (const item of items) {
                await connection.query(
                    `INSERT INTO order_items (order_id, product_name, quantity, unit_price)
                 VALUES (?, ?, ?, ?)`,
                    [orderId, item.product_name, item.quantity, item.unit_price]
                );
            }

            await connection.commit();
            return orderId;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    // Update order fields and, when given, replace its items (transaction).
    // Fields left undefined keep their current value.
    async updateOrder(orderId, orderData, items, paymentPath) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.query(`SELECT id FROM orders WHERE id = ?`, [orderId]);
            if (existing.length === 0) {
                await connection.rollback();
                return false;
            }

            const { name, address, phone, city, postal_code, order_complete } = orderData;
            // FormData sends booleans as strings ('true' / '1')
            const complete = order_complete === undefined || order_complete === ''
                ? null
                : (order_complete === true || order_complete === 'true' || String(order_complete) === '1' ? 1 : 0);

            await connection.query(
                `UPDATE orders SET
                    name = COALESCE(?, name),
                    address = COALESCE(?, address),
                    phone = COALESCE(?, phone),
                    city = COALESCE(?, city),
                    postal_code = COALESCE(?, postal_code),
                    order_complete = COALESCE(?, order_complete),
                    payment_screen_short = COALESCE(?, payment_screen_short)
                 WHERE id = ?`,
                [name, address, phone, city, postal_code, complete, paymentPath, orderId]
            );

            if (Array.isArray(items)) {
                await connection.query(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO order_items (order_id, product_name, quantity, unit_price)
                     VALUES (?, ?, ?, ?)`,
                        [orderId, item.product_name, item.quantity, item.unit_price]
                    );
                }
            }

            await connection.commit();
            return true;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    // Get all orders with their items.
    // Items are fetched in a second query rather than with GROUP_CONCAT: MySQL
    // silently cuts GROUP_CONCAT at 1024 bytes, so an order with many items
    // produced truncated JSON and JSON.parse took down the whole orders list.
    async getAllOrders() {
        const [orders] = await db.query(`SELECT * FROM orders ORDER BY created_at DESC`);
        if (orders.length === 0) return [];

        const [items] = await db.query(
            `SELECT order_id, product_name, quantity, unit_price
             FROM order_items
             WHERE order_id IN (?)
             ORDER BY id`,
            [orders.map(o => o.id)]
        );

        const itemsByOrder = new Map();
        for (const { order_id, ...item } of items) {
            if (!itemsByOrder.has(order_id)) itemsByOrder.set(order_id, []);
            itemsByOrder.get(order_id).push(item);
        }

        return orders.map(order => {
            const orderItems = itemsByOrder.get(order.id) || [];
            // items_json kept for clients that still read the old field
            return { ...order, items_json: JSON.stringify(orderItems), items: orderItems };
        });
    },

    // Get single order by id
    async getOrderById(orderId) {
        const [orders] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
        if (orders.length === 0) return null;

        const [items] = await db.query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]);
        return { ...orders[0], items };
    },

    // Delete order (items cascade)
    async deleteOrder(orderId) {
        const [result] = await db.query(`DELETE FROM orders WHERE id = ?`, [orderId]);
        return result.affectedRows > 0;
    },

    // Mark order as complete
    async completeOrder(orderId) {
        const [result] = await db.query(
            `UPDATE orders SET order_complete = 1 WHERE id = ?`,
            [orderId]
        );
        return result.affectedRows > 0;
    }
};

module.exports = OrderModel;