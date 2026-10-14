const CouponModel = require('../models/couponModel');

const isDuplicate = (err) => err && err.code === 'ER_DUP_ENTRY';

const createCoupon = async (req, res, next) => {
    try {
        const { value, error } = CouponModel.validate(req.body);
        if (error) return res.status(400).json({ message: error });
        const coupon = await CouponModel.create(value);
        res.status(201).json({ message: 'Coupon created', coupon });
    } catch (err) {
        if (isDuplicate(err)) return res.status(409).json({ message: 'A coupon with this code already exists' });
        next(err);
    }
};

const getAllCoupons = async (req, res, next) => {
    try {
        const coupons = await CouponModel.findAll();
        res.json({ coupons, count: coupons.length });
    } catch (err) {
        next(err);
    }
};

const updateCoupon = async (req, res, next) => {
    try {
        const existing = await CouponModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Coupon not found' });

        // A bare { is_active } request is the dashboard's on/off switch
        const keys = Object.keys(req.body || {});
        if (keys.length === 1 && keys[0] === 'is_active') {
            const active = req.body.is_active === true || req.body.is_active === 'true' || String(req.body.is_active) === '1';
            const coupon = await CouponModel.setActive(req.params.id, active);
            return res.json({ message: 'Coupon updated', coupon });
        }

        const { value, error } = CouponModel.validate({ ...existing, ...req.body });
        if (error) return res.status(400).json({ message: error });
        const coupon = await CouponModel.update(req.params.id, value);
        res.json({ message: 'Coupon updated', coupon });
    } catch (err) {
        if (isDuplicate(err)) return res.status(409).json({ message: 'A coupon with this code already exists' });
        next(err);
    }
};

const deleteCoupon = async (req, res, next) => {
    try {
        const deleted = await CouponModel.delete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Coupon not found' });
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        next(err);
    }
};

// Public: checkout calls this when the customer presses Apply
const validateCoupon = async (req, res, next) => {
    try {
        const { code, subtotal } = req.body || {};
        if (!code || !String(code).trim()) return res.status(400).json({ message: 'Please enter a coupon code' });

        const coupon = await CouponModel.findByCode(code);
        const result = CouponModel.evaluate(coupon, subtotal);
        if (result.error) return res.status(400).json({ message: result.error });

        res.json({
            valid: true,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount: result.discount
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { createCoupon, getAllCoupons, updateCoupon, deleteCoupon, validateCoupon };
