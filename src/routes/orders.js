// ═══════════════════════════════════════════════════════════
//  Order routes — place, my-orders
// ═══════════════════════════════════════════════════════════

const express = require('express');
const db = require('../config/db');
const { GST_RATE } = require('../config/constants');

const router = express.Router();

// ── Place a cash order ───────────────────────────────────────
router.post('/place', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ success: false, message: 'Login required' });

  const { items, table_no, notes } = req.body;
  if (!items || !items.length) return res.json({ success: false, message: 'No items in cart' });

  // Build parameterized array of menu_ids
  const menuIds = items.map(i => i.menu_id);
  if (menuIds.length === 0) return res.json({ success: false, message: 'Invalid items' });

  const placeholders = menuIds.map(() => '?').join(',');
  db.query(
    `SELECT id, price FROM menu WHERE id IN (${placeholders})`,
    menuIds,
    (err, menuItems) => {
      if (err) return res.json({ success: false, message: 'Database error' });

      let totalPrice = 0;
      const itemsWithPrice = items.map(cartItem => {
        const menuItem = menuItems.find(m => m.id === cartItem.menu_id);
        const price = menuItem ? parseFloat(menuItem.price) : 0;
        totalPrice += price * (parseInt(cartItem.quantity) || 1);
        return { ...cartItem, price };
      });

      totalPrice = totalPrice * (1 + GST_RATE);

      db.query(
        'INSERT INTO orders (user_id, total_price, status, table_no, notes) VALUES (?, ?, ?, ?, ?)',
        [user.id, totalPrice, 'Pending', table_no || null, notes || null],
        (err, result) => {
          if (err) return res.json({ success: false, message: err.message });

          const orderId = result.insertId;
          const itemValues = itemsWithPrice.map(i => [
            orderId, i.menu_id, i.quantity, i.price,
          ]);

          db.query(
            'INSERT INTO order_items (order_id, menu_id, quantity, unit_price) VALUES ?',
            [itemValues],
            (err) => {
              if (err) return res.json({ success: false, message: err.message });
              res.json({ success: true, data: { order_id: orderId } });
            }
          );
        }
      );
    }
  );
});

// ── Get current user's orders ────────────────────────────────
router.get('/my-orders', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ success: false, message: 'Login required' });

  db.query(
    `SELECT o.*,
            m.name as item_name, oi.quantity, oi.unit_price
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     JOIN menu m ON oi.menu_id = m.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [user.id],
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });

      const orders = [];
      results.forEach(row => {
        let order = orders.find(o => o.id === row.id);
        if (!order) {
          order = {
            id: row.id,
            user_id: row.user_id,
            total_price: row.total_price,
            status: row.status,
            table_no: row.table_no,
            notes: row.notes,
            created_at: row.created_at,
            items: [],
          };
          orders.push(order);
        }
        order.items.push({
          name: row.item_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
        });
      });

      res.json({ success: true, data: orders });
    }
  );
});

// ── Get a single order by ID (for receipts) ───────────────────
router.get('/:id', (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ success: false, message: 'Login required' });

  db.query(
    `SELECT o.*,
            m.name as item_name, oi.quantity, oi.unit_price, c.name as category_name
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     JOIN menu m ON oi.menu_id = m.id
     JOIN categories c ON m.category_id = c.id
     WHERE o.id = ? AND o.user_id = ?`,
    [req.params.id, user.id],
    (err, rows) => {
      if (err) return res.json({ success: false, message: err.message });
      if (!rows.length) return res.json({ success: false, message: 'Order not found' });

      const order = {
        id: rows[0].id,
        total_price: rows[0].total_price,
        status: rows[0].status,
        table_no: rows[0].table_no,
        notes: rows[0].notes,
        created_at: rows[0].created_at,
        payment_method: rows[0].payment_method,
        items: rows.map(r => ({
          name: r.item_name,
          quantity: r.quantity,
          unit_price: r.unit_price,
          category: r.category_name,
        })),
      };

      db.query('SELECT name, email FROM users WHERE id=?', [user.id], (err2, userRows) => {
        if (!err2 && userRows.length) {
          order.user_name = userRows[0].name;
          order.user_email = userRows[0].email;
        }
        res.json({ success: true, data: order });
      });
    }
  );
});

module.exports = router;
