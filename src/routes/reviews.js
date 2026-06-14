const express = require('express');
const db = require('../config/db');

const router = express.Router();

// ── Submit a review (public) ──────────────────────────────────
router.post('/', (req, res) => {
  const { name, rating, comment } = req.body;

  if (!name || !name.trim()) return res.json({ success: false, message: 'Name is required' });
  if (!rating || rating < 1 || rating > 5) return res.json({ success: false, message: 'Rating must be between 1 and 5' });
  if (!comment || !comment.trim()) return res.json({ success: false, message: 'Comment is required' });

  const userId = req.session.user ? req.session.user.id : null;

  db.query(
    'INSERT INTO reviews (user_id, name, rating, comment, approved) VALUES (?, ?, ?, ?, 0)',
    [userId, name.trim(), rating, comment.trim()],
    (err, result) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, message: 'Thank you! Your review has been submitted for approval.' });
    }
  );
});

// ── Get approved reviews (public) ────────────────────────────
router.get('/', (req, res) => {
  db.query(
    'SELECT name, rating, comment, created_at FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT 50',
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    }
  );
});

module.exports = router;
