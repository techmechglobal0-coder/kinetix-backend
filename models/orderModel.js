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

    // Get all orders with items as JSON
    async getAllOrders() {
        const [rows] = await db.query(`
        SELECT o.*,
               CONCAT('[',
                   GROUP_CONCAT(
                       JSON_OBJECT('product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)
                       ORDER BY oi.id
                       SEPARATOR ','
                   ),
               ']') AS items_json
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `);
        // Parse items_json for each row
        const orders = rows.map(row => ({
            ...row,
            items: row.items_json ? JSON.parse(row.items_json) : []
        }));
        return orders;
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