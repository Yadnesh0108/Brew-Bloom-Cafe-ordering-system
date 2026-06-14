// ═══════════════════════════════════════════════════════════
//  Brew & Bloom Cafe — Main Server Entry Point
//  Express 4.x with modular routes, MySQL sessions, OAuth
// ═══════════════════════════════════════════════════════════

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// ── Route modules ───────────────────────────────────────────
const authRoutes   = require('./src/routes/auth');
const menuRoutes   = require('./src/routes/menu');
const orderRoutes  = require('./src/routes/orders');
const adminRoutes  = require('./src/routes/admin');
const paymentRoutes = require('./src/routes/payment');
const reviewRoutes  = require('./src/routes/reviews');

const app = express();

// ── Body parsing ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ── MySQL Session Store ─────────────────────────────────────
const sessionStore = new MySQLStore({
  host:     process.env.DB_HOST || 'localhost',
  port:     3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'cafe_db',
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires:    'expires',
      data:       'session_data',
    },
  },
});

app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_secret_for_dev',
  store:             sessionStore,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,    // Set true if using HTTPS in production
    httpOnly: true,
    maxAge:   1000 * 60 * 60 * 24,  // 24 hours
  },
}));

// ── Passport — OAuth ────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id=?', [id], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);
  });
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here') {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  '/auth/google/callback',
  }, (accessToken, refreshToken, profile, done) => {
    db.query('SELECT * FROM users WHERE google_id=?', [profile.id], (err, results) => {
      if (err) return done(err);
      if (results.length > 0) {
        return done(null, results[0]);
      }
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@google-oauth.local`;
      db.query(
        'INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)',
        [profile.displayName, email, profile.id, 'user'],
        (err, result) => {
          if (err) return done(err);
          db.query('SELECT * FROM users WHERE id=?', [result.insertId], (err, users) => {
            done(null, users[0]);
          });
        }
      );
    });
  }));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_ID !== 'your_facebook_app_id_here') {
  passport.use(new FacebookStrategy({
    clientID:     process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL:  '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails'],
  }, (accessToken, refreshToken, profile, done) => {
    db.query('SELECT * FROM users WHERE google_id=?', [profile.id], (err, results) => {
      if (err) return done(err);
      if (results.length > 0) {
        return done(null, results[0]);
      }
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook-oauth.local`;
      db.query(
        'INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)',
        [profile.displayName, email, profile.id, 'user'],
        (err, result) => {
          if (err) return done(err);
          db.query('SELECT * FROM users WHERE id=?', [result.insertId], (err, users) => {
            done(null, users[0]);
          });
        }
      );
    });
  }));
}

// ── API Routes ──────────────────────────────────────────────
app.use('/api',               authRoutes);
app.use('/api/menu',           menuRoutes);
app.use('/api/orders',         orderRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/payment',        paymentRoutes);
app.use('/api/reviews',        reviewRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// ── Global error handler (must be last middleware) ───────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`☕ Brew & Bloom Cafe — Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Production mode — ensure HTTPS is set up via reverse proxy`);
  }
});
