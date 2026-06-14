// ═══════════════════════════════════════════════════════════
//  js/main.js  —  Shared utilities for all pages
// ═══════════════════════════════════════════════════════════

const API_BASE = '/api/';

const MENU_IMAGE_QUERIES = {
  'espresso.jpg': 'espresso coffee shot',
  'cappuccino.jpg': 'cappuccino coffee latte art',
  'latte.jpg': 'cafe latte coffee cup',
  'coldbrew.jpg': 'cold brew coffee glass',
  'macchiato.jpg': 'caramel macchiato coffee',
  'mocha.jpg': 'mocha coffee chocolate drink',
  'chai.jpg': 'masala chai tea cup',
  'greentea.jpg': 'green tea cup leaves',
  'chamomile.jpg': 'chamomile tea cup',
  'icedtea.jpg': 'iced lemon tea glass',
  'croissant.jpg': 'butter croissant pastry',
  'bananabread.jpg': 'banana bread slice',
  'sandwich.jpg': 'club sandwich platter',
  'bruschetta.jpg': 'bruschetta toast',
  'muffin.jpg': 'chocolate muffin dessert',
  'oreoshake.jpg': 'oreo milkshake glass',
  'mangoshake.jpg': 'mango shake glass',
  'strawshake.jpg': 'strawberry shake glass',
  'dalgona.jpg': 'dalgona coffee whipped',
  'affogato.jpg': 'affogato dessert coffee',
  'frappe.jpg': 'coffee frappe whipped cream'
};

// ── API helpers ───────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : API_BASE + endpoint;
  const defaults = { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } };
  const config = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };
  try {
    const res = await fetch(url, config);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

const api = {
  get:    (ep)         => apiFetch(ep),
  post:   (ep, body)   => apiFetch(ep, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (ep, body)   => apiFetch(ep, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (ep)         => apiFetch(ep, { method: 'DELETE' }),
};

// ── Toast notifications ────────────────────────────────────
function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
}

function toast(message, type = 'info', duration = 3500) {
  initToastContainer();
  const container = document.querySelector('.toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
  setTimeout(() => div.remove(), duration);
}

// ── Cart (localStorage) ────────────────────────────────────
const Cart = {
  STORAGE_KEY: 'cafe_cart',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(item) {           // item: { menu_id, name, price, image, category }
    const items = this.getAll();
    const idx   = items.findIndex(i => i.menu_id === item.menu_id);
    if (idx >= 0) { items[idx].quantity++; }
    else          { items.push({ ...item, quantity: 1 }); }
    this.save(items);
    toast(`${item.name} added to cart 🛒`, 'success', 2000);
  },

  remove(menu_id) {
    this.save(this.getAll().filter(i => i.menu_id !== menu_id));
  },

  updateQty(menu_id, qty) {
    if (qty < 1) { this.remove(menu_id); return; }
    const items = this.getAll();
    const idx   = items.findIndex(i => i.menu_id === menu_id);
    if (idx >= 0) { items[idx].quantity = qty; this.save(items); }
  },

  clear() { localStorage.removeItem(this.STORAGE_KEY); this.updateBadge(); },

  count()  { return this.getAll().reduce((s, i) => s + i.quantity, 0); },

  total()  { return this.getAll().reduce((s, i) => s + i.price * i.quantity, 0); },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-count');
    const n = this.count();
    badges.forEach(b => { b.textContent = n; b.style.display = n > 0 ? 'inline-flex' : 'none'; });
  }
};

// ── Auth helpers ───────────────────────────────────────────
const Auth = {
  _user: null,

  async getUser(force = false) {
    if (this._user && !force) return this._user;
    const res = await api.get('user');
    this._user = res.loggedIn ? res.user : null;
    return this._user;
  },

  async requireLogin(redirectTo = 'login.html') {
    const user = await this.getUser();
    if (!user) { window.location.href = redirectTo; return null; }
    return user;
  },

  async logout() {
    try {
      await fetch('/api/logout', { method: 'GET', credentials: 'same-origin' });
    } catch (_) {}
    Cart.clear();
    this._user = null;
    window.location.replace('login.html');
  }
};

// ── Navbar dynamic state ───────────────────────────────────
async function initNavbar() {
  Cart.updateBadge();

  // Hamburger toggle
  const hamburger = document.querySelector('.hamburger');
  const links     = document.querySelector('.navbar__links');
  if (hamburger && links) {
    hamburger.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Highlight active link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Auth-aware nav
  const user = await Auth.getUser();
  const authLink = document.getElementById('nav-auth');
  const logoutBtn = document.getElementById('nav-logout');
  const adminLink = document.getElementById('nav-admin');

  if (authLink) authLink.style.display = user ? 'none' : 'inline-flex';
  if (logoutBtn) {
    logoutBtn.style.display = user ? 'inline-flex' : 'none';
    logoutBtn.addEventListener('click', () => Auth.logout());
  }
  if (adminLink) adminLink.style.display = (user && user.role === 'admin') ? 'inline-flex' : 'none';

  const ordersLink = document.getElementById('nav-orders');
  if (ordersLink) ordersLink.style.display = (user && user.role === 'admin') ? 'none' : '';

  const userLabel = document.getElementById('nav-user-name');
  if (userLabel && user) userLabel.textContent = user.name.split(' ')[0];
}

// ── Rupee formatter ────────────────────────────────────────
function formatPrice(n) {
  return '₹' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getMenuImageSrc(item) {
  const raw = String(item?.image || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  const query = MENU_IMAGE_QUERIES[raw.toLowerCase()] || MENU_IMAGE_QUERIES[String(item?.name || '').trim().toLowerCase()];
  if (query) return `https://picsum.photos/seed/${encodeURIComponent(item?.name || 'item')}/800/600`;

  return `backend/uploads/${raw}`;
}

function getVisibleMenuItems(items = []) {
  const seen = new Set();
  return items.filter(item => {
    const img = getMenuImageSrc(item);
    if (!img) return false;
    const key = `${item.category_id}:${String(item.name || '').trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(item => ({ ...item, resolved_image: getMenuImageSrc(item) }));
}

// ── Date formatter ─────────────────────────────────────────
function formatDate(str) {
  return new Date(str).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Spinner helpers ────────────────────────────────────────
function showSpinner(container) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
}
function showEmpty(container, icon, title, sub = '') {
  container.innerHTML = `<div class="empty-state"><div class="icon">${icon}</div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>`;
}

// ── Init on load ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initAnimations();
});

// ── Enhanced Scroll & Reveal Animations ─────────────────────
function initAnimations() {
  // 1. Reveal on scroll (Intersection Observer)
  const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once revealed, stop observing
        observer.unobserve(entry.target);
      }
    });
  };

  const revealObserver = new IntersectionObserver(revealCallback, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
  });

  // 2. Scroll Progress & Navbar Effects
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '↑';
  backToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPos   = window.pageYOffset || document.documentElement.scrollTop;
    
    // Update progress bar
    const progress = (scrollPos / totalHeight) * 100;
    progressBar.style.width = `${progress}%`;

    // Navbar shrink
    const nav = document.querySelector('.navbar');
    if (nav) {
      if (scrollPos > 50) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }

    // Back to top visibility
    if (scrollPos > 300) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
  });

function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

  // 3. Stagger check for children
  document.querySelectorAll('.active-stagger').forEach(parent => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        parent.classList.add('active');
        observer.unobserve(parent);
      }
    }, { threshold: 0.1 });
    observer.observe(parent);
  });
}
