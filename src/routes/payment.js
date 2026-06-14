// ═══════════════════════════════════════════════════════════
//  Payment routes — Razorpay order creation & verification
// ═══════════════════════════════════════════════════════════

const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { GST_RATE } = require('../config/constants');

const router = express.Router();

// ── Create a Razorpay order (initiated from frontend) ────────
router.post('/create-order', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ success: false, message: 'Login required' });

  const { items, table_no, notes } = req.body;
  if (!items || !items.length) return res.json({ success: false, message: 'No items in cart' });

  try {
    const menuIds = items.map(i => i.menu_id);
    const [menuRows] = await db.promise().query(
      'SELECT id, price FROM menu WHERE id IN (?)',
      [menuIds]
    );

    let totalPaise = 0;
    for (const cartItem of items) {
      const dbItem = menuRows.find(m => m.id === cartItem.menu_id);
      if (!dbItem) continue;
      const unitPaise = Math.round(parseFloat(dbItem.price) * 100);
      const qty = parseInt(cartItem.quantity) || 1;
      totalPaise += unitPaise * qty;
    }

    // Apply GST
    totalPaise += Math.round(totalPaise * GST_RATE);

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: totalPaise,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      order_id: order.id,
      amount: totalPaise,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay session error:', err.message);
    res.json({ success: false, message: 'Payment gateway error: ' + err.message });
  }
});

// ── Verify Razorpay payment signature ────────────────────────
router.post('/verify', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ success: false, message: 'Login required' });

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    items,
    table_no,
    notes,
  } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  try {
    const menuIds = items.map(i => i.menu_id);
    const [menuRows] = await db.promise().query(
      'SELECT id, price FROM menu WHERE id IN (?)',
      [menuIds]
    );

    let totalRs = 0;
    for (const cartItem of items) {
      const dbItem = menuRows.find(m => m.id === cartItem.menu_id);
      if (dbItem) totalRs += parseFloat(dbItem.price) * (parseInt(cartItem.quantity) || 1);
    }
    totalRs = totalRs * (1 + GST_RATE);

    const [orderResult] = await db.promise().query(
      `INSERT INTO orders (user_id, total_price, status, table_no, notes, payment_method, payment_reference)
       VALUES (?, ?, 'Paid', ?, ?, 'razorpay', ?)`,
      [user.id, totalRs, table_no || null, notes || null, razorpay_payment_id]
    );
    const orderId = orderResult.insertId;

    const itemValues = items.map(i => {
      const dbItem = menuRows.find(m => m.id === i.menu_id);
      return [orderId, i.menu_id, i.quantity, dbItem ? dbItem.price : 0];
    });
    await db.promise().query(
      'INSERT INTO order_items (order_id, menu_id, quantity, unit_price) VALUES ?',
      [itemValues]
    );

    res.json({ success: true, order_id: orderId });
  } catch (err) {
    console.error('Payment verification error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
