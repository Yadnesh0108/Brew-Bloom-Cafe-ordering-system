// ═══════════════════════════════════════════════════════════
//  Admin routes — dashboard summary, orders CRUD, menu CRUD
// ═══════════════════════════════════════════════════════════

const express = require('express');
const db = require('../config/db');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────
function sanitize(input) {
  if (typeof input !== 'string') return input;
  // Strip HTML tags for basic sanitization
  return input.replace(/<[^>]*>/g, '');
}

// ── Dashboard summary ────────────────────────────────────────
router.get('/summary', isAdmin, async (req, res) => {
  const todayQuery =
    "SELECT COUNT(*) as total_orders, IFNULL(SUM(total_price),0) as revenue FROM orders WHERE DATE(created_at) = CURDATE()";
  const weekQuery =
    "SELECT IFNULL(SUM(total_price),0) as revenue FROM orders WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
  const totalQuery = "SELECT COUNT(*) as total_orders FROM orders";
  const statusQuery = "SELECT status, COUNT(*) as cnt FROM orders GROUP BY status";
  const topItemsQuery =
    "SELECT m.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as revenue FROM order_items oi JOIN menu m ON oi.menu_id = m.id GROUP BY m.id ORDER BY total_qty DESC LIMIT 5";

  try {
    const [today] = await db.promise().query(todayQuery);
    const [week] = await db.promise().query(weekQuery);
    const [total] = await db.promise().query(totalQuery);
    const [statuses] = await db.promise().query(statusQuery);
    const [topItems] = await db.promise().query(topItemsQuery);

    res.json({
      success: true,
      data: {
        today: today[0],
        this_week: week[0],
        all_time: total[0],
        by_status: statuses,
        top_items: topItems,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── Transaction statement (bank-statement style) ───────────────
router.get('/transactions', isAdmin, async (req, res) => {
  const { from, to, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereClause = '';
  const params = [];
  if (from && to) {
    whereClause = 'WHERE o.created_at BETWEEN ? AND ?';
    params.push(from, to);
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT o.id, o.total_price, o.status, o.created_at, o.payment_method,
              u.name as user_name, u.email as user_email,
              GROUP_CONCAT(CONCAT(m.name,'×',oi.quantity) SEPARATOR ', ') as items_list
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN order_items oi ON o.id = oi.order_id
       JOIN menu m ON oi.menu_id = m.id
       ${whereClause}
       GROUP BY o.id
       ORDER BY o.created_at ASC`,
      params
    );
    const allRows = rows;

    // Apply pagination after running balance calc
    let runningBalance = 0;
    const statement = allRows.map(r => {
      const credit = (r.status !== 'Cancelled') ? parseFloat(r.total_price) : 0;
      const debit  = (r.status === 'Cancelled') ? parseFloat(r.total_price) : 0;
      runningBalance += credit;
      return {
        id: r.id,
        date: r.created_at,
        description: `Order #${r.id} — ${r.user_name}`,
        items: r.items_list,
        customer: r.user_name,
        email: r.user_email,
        method: r.payment_method || 'cash',
        debit: debit,
        credit: credit,
        balance: runningBalance,
        status: r.status,
      };
    });

    const total = statement.length;
    const paginated = statement.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        transactions: paginated.reverse(),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        closing_balance: runningBalance,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── All orders ───────────────────────────────────────────────
router.get('/all-orders', isAdmin, (req, res) => {
  db.query(
    `SELECT o.*, u.name as user_name, u.email as user_email,
            m.name as item_name, oi.quantity, oi.unit_price
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN order_items oi ON o.id = oi.order_id
     JOIN menu m ON oi.menu_id = m.id
     ORDER BY o.created_at DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });

      const orders = [];
      results.forEach(row => {
        let order = orders.find(o => o.id === row.id);
        if (!order) {
          order = { ...row, items: [] };
          delete order.item_name;
          delete order.quantity;
          delete order.unit_price;
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

// ── Single order ─────────────────────────────────────────────
router.get('/orders/:id', isAdmin, (req, res) => {
  db.query(
    `SELECT o.*, u.name as user_name, u.email as user_email,
            m.name as item_name, oi.quantity, oi.unit_price
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN order_items oi ON o.id = oi.order_id
     JOIN menu m ON oi.menu_id = m.id
     WHERE o.id = ?`,
    [req.params.id],
    (err, results) => {
      if (err || !results.length)
        return res.json({ success: false, message: 'Order not found' });

      const order = { ...results[0], items: [] };
      delete order.item_name;
      delete order.quantity;
      delete order.unit_price;
      results.forEach(row =>
        order.items.push({
          name: row.item_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
        })
      );
      res.json({ success: true, data: order });
    }
  );
});

// ── Update order status ─────────────────────────────────────
router.put('/orders/:id/status', isAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    'Pending',
    'Preparing',
    'Ready',
    'Delivered',
    'Cancelled',
    'Paid',
  ];
  if (!validStatuses.includes(status)) {
    return res.json({ success: false, message: 'Invalid status value' });
  }

  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], err => {
    if (err) return res.json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// ── Add menu item ───────────────────────────────────────────
router.post('/menu', isAdmin, (req, res) => {
  const { category_id, name, description, price, available, image } = req.body;
  const sanitizedDesc = description ? sanitize(description) : null;
  db.query(
    'INSERT INTO menu (category_id, name, description, price, available, image) VALUES (?, ?, ?, ?, ?, ?)',
    [category_id, name, sanitizedDesc, price, available !== undefined ? available : 1, image || null],
    err => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

// ── Update menu item ─────────────────────────────────────────
router.put('/menu', isAdmin, (req, res) => {
  const { id, category_id, name, description, price, available, image } = req.body;
  const sanitizedDesc = description ? sanitize(description) : null;
  db.query(
    'UPDATE menu SET category_id=?, name=?, description=?, price=?, available=?, image=? WHERE id=?',
    [category_id, name, sanitizedDesc, price, available, image, id],
    err => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

// ── Delete menu item ─────────────────────────────────────────
router.delete('/menu/:id', isAdmin, (req, res) => {
  db.query('DELETE FROM menu WHERE id = ?', [req.params.id], err => {
    if (err) return res.json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// ── Delete ALL menu items ─────────────────────────────────────
router.delete('/menu', isAdmin, (req, res) => {
  db.query('DELETE FROM menu', err => {
    if (err) return res.json({ success: false, message: err.message });
    db.query('ALTER TABLE menu AUTO_INCREMENT = 1', () => {});
    res.json({ success: true, message: 'All menu items deleted' });
  });
});

module.exports = router;
