const pool = require('../db');

const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

class CouponModel {
    static normalizeCode(code) {
        return normalizeCode(code);
    }

    static mapRow(row) {
        if (!row) return row;
        return {
            ...row,
            discount_value: Number(row.discount_value),
            min_order_amount: toNullableNumber(row.min_order_amount),
            max_discount_amount: toNullableNumber(row.max_discount_amount),
            usage_limit: row.usage_limit === null ? null : Number(row.usage_limit),
            used_count: Number(row.used_count) || 0,
            is_active: row.is_active ? 1 : 0
        };
    }

    // Shared by create and update so both apply the same rules
    static validate(data) {
        const code = normalizeCode(data.code);
        if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
            return { error: 'Code must be 3-50 characters: letters, numbers, - or _' };
        }
        const discount_type = data.discount_type === 'fixed' ? 'fixed' : 'percent';
        const discount_value = Number(data.discount_value);
        if (!Number.isFinite(discount_value) || discount_value <= 0) {
            return { error: 'Discount value must be greater than 0' };
        }
        if (discount_type === 'percent' && discount_value > 100) {
            return { error: 'A percentage discount cannot exceed 100' };
        }
        const usage_limit = toNullableNumber(data.usage_limit);
        if (usage_limit !== null && (!Number.isInteger(usage_limit) || usage_limit < 1)) {
            return { error: 'Usage limit must be a whole number of 1 or more' };
        }
        let expires_at = null;
        if (data.expires_at) {
            const date = new Date(data.expires_at);
            if (Number.isNaN(date.getTime())) return { error: 'Invalid expiry date' };
            expires_at = date;
        }
        return {
            value: {
                code,
                discount_type,
                discount_value,
                min_order_amount: toNullableNumber(data.min_order_amount),
                max_discount_amount: discount_type === 'percent' ? toNullableNumber(data.max_discount_amount) : null,
                usage_limit,
                expires_at,
                is_active: data.is_active === undefined ? 1 : (data.is_active === true || data.is_active === 'true' || String(data.is_active) === '1' ? 1 : 0)
            }
        };
    }

    static async create(data) {
        const [result] = await pool.query(
            `INSERT INTO coupons
             (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.code, data.discount_type, data.discount_value, data.min_order_amount,
                data.max_discount_amount, data.usage_limit, data.expires_at, data.is_active]
        );
        return this.findById(result.insertId);
    }

    static async findAll() {
        const [rows] = await pool.query('SELECT * FROM coupons ORDER BY id DESC');
        return rows.map(row => this.mapRow(row));
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM coupons WHERE id = ?', [id]);
        return this.mapRow(rows[0]);
    }

    static async findByCode(code, connection = pool) {
        const [rows] = await connection.query('SELECT * FROM coupons WHERE code = ?', [normalizeCode(code)]);
        return this.mapRow(rows[0]);
    }

    static async update(id, data) {
        await pool.query(
            `UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?,
             max_discount_amount = ?, usage_limit = ?, expires_at = ?, is_active = ? WHERE id = ?`,
            [data.code, data.discount_type, data.discount_value, data.min_order_amount,
                data.max_discount_amount, data.usage_limit, data.expires_at, data.is_active, id]
        );
        return this.findById(id);
    }

    static async setActive(id, isActive) {
        await pool.query('UPDATE coupons SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
        return this.findById(id);
    }

    static async delete(id) {
        const [result] = await pool.query('DELETE FROM coupons WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // Works out what a coupon takes off a given subtotal. The discount only
    // applies to the goods, never to delivery. Returns { error } when the
    // coupon cannot be used, so checkout and order creation say the same thing.
    static evaluate(coupon, subtotal) {
        if (!coupon) return { error: 'Invalid coupon code' };
        if (!coupon.is_active) return { error: 'This coupon is no longer active' };
        if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
            return { error: 'This coupon has expired' };
        }
        if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
            return { error: 'This coupon has reached its usage limit' };
        }
        const amount = Number(subtotal) || 0;
        if (coupon.min_order_amount !== null && amount < coupon.min_order_amount) {
            return { error: `Minimum order of Rs ${coupon.min_order_amount.toFixed(2)} required for this coupon` };
        }

        let discount = coupon.discount_type === 'percent'
            ? amount * (coupon.discount_value / 100)
            : coupon.discount_value;
        if (coupon.max_discount_amount !== null) discount = Math.min(discount, coupon.max_discount_amount);
        discount = Math.min(discount, amount);
        discount = Math.round(discount * 100) / 100;

        return { discount };
    }

    // Counts one use. The WHERE guard means two simultaneous orders cannot both
    // take the last use of a limited coupon.
    static async consume(id, connection = pool) {
        const [result] = await connection.query(
            `UPDATE coupons SET used_count = used_count + 1
             WHERE id = ? AND (usage_limit IS NULL OR used_count < usage_limit)`,
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = CouponModel;
