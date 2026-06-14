// ═══════════════════════════════════════════════════════════
//  Menu routes — items, categories, images
// ═══════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const db = require('../config/db');
const { IMAGE_DEFAULTS } = require('../config/constants');

const router = express.Router();

const IMAGES_CACHE_DIR = path.resolve(IMAGE_DEFAULTS.CACHE_DIR);
fs.mkdirSync(IMAGES_CACHE_DIR, { recursive: true });

// ── Helper: download image with redirect following ───────────
function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => { file.close(resolve); });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// ── GET /api/menu — all available items ──────────────────────
router.get('/', (req, res) => {
  db.query(
    `SELECT m.*, c.name as category_name, c.icon as category_icon
     FROM menu m
     JOIN categories c ON m.category_id = c.id
     WHERE m.available = 1`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    }
  );
});

// ── GET /api/menu/categories — all categories ────────────────
router.get('/categories', (req, res) => {
  db.query('SELECT * FROM categories', (err, results) => {
    if (err) return res.json({ success: false, message: err.message });
    res.json({ success: true, data: results });
  });
});

// ── GET /api/menu/images — image URLs for all available items ──
router.get('/images', (req, res) => {
  db.query('SELECT id, name, image FROM menu WHERE available = 1', (err, results) => {
    if (err) return res.json({ success: false, message: err.message });
    const data = results.map(item => ({
      id: item.id,
      name: item.name,
      image_url: `/api/menu/images/${item.id}`,
    }));
    res.json({ success: true, data });
  });
});

// ── GET /api/menu/images/:id — fetch + cache + serve food image ──
router.get('/images/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

  const cachedFile = path.join(IMAGES_CACHE_DIR, `${id}.jpg`);

  // Serve cached image immediately
  if (fs.existsSync(cachedFile) && fs.statSync(cachedFile).size > 0) {
    return res.sendFile(cachedFile);
  }

  try {
    const [rows] = await db.promise().query('SELECT name FROM menu WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Item not found' });

    const itemName = rows[0].name;
    const searchKey = itemName.split(/\s+/)[0].toLowerCase();

    const imageUrl = `https://loremflickr.com/800/600/${encodeURIComponent(searchKey)}`;

    await downloadImage(imageUrl, cachedFile);
    res.sendFile(cachedFile);
  } catch (err) {
    console.error('Image fetch error:', err.message);
    res.status(502).json({ success: false, message: 'Could not fetch image' });
  }
});

module.exports = router;
