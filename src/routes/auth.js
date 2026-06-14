// ═══════════════════════════════════════════════════════════
//  Auth routes — register, login, logout, session, OAuth
// ═══════════════════════════════════════════════════════════

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const router = express.Router();

// ── Register ─────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.json({ success: false, message: 'Missing fields' });
  }

  const userRole = role === 'admin' ? 'admin' : 'user';
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, userRole],
    (err) => {
      if (err) {
        // MySQL duplicate entry
        if (err.code === 'ER_DUP_ENTRY') {
          return res.json({ success: false, message: 'Email already exists' });
        }
        return res.json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, message: 'Registered successfully' });
    }
  );
});

// ── Login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, name, password } = req.body;

  // Support admin login by name (legacy) OR user login by email
  const query = name && email
    ? 'SELECT * FROM users WHERE name=? AND email=?'
    : email
      ? 'SELECT * FROM users WHERE email=?'
      : null;

  const identifier = (name && email) ? [name, email] : [email];

  if (!query) {
    return res.json({ success: false, message: 'Email is required' });
  }

  db.query(query, identifier, (err, result) => {
    if (err) return res.json({ success: false, message: 'Server error' });
    if (result.length === 0) {
      return res.json({ success: false, message: 'User not found' });
    }

    const user = result[0];
    if (!user.password) {
      return res.json({
        success: false,
        message: 'This account uses social login. Please sign in with Google/Facebook.',
      });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.json({ success: false, message: 'Wrong password' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.json({ success: true, data: req.session.user });
  });
});

// ── Get current user from session ────────────────────────────
router.get('/user', (req, res) => {
  if (req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  res.json({ loggedIn: false });
});

// ── Logout ───────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.json({ success: false, message: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ── Google OAuth callback ────────────────────────────────────
router.get('/google', (req, res) => {
  // This should be handled by Passport — just a placeholder for the route
  res.redirect('/auth/google');
});

// ── Facebook OAuth callback ──────────────────────────────────
router.get('/facebook/callback', (req, res, next) => {
  // Passport Facebook strategy callback
  const passport = require('passport');
  passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/login.html',
  })(req, res, next);
});

module.exports = router;
