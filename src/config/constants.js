// ═══════════════════════════════════════════════════════════
//  Global constants & configuration
// ═══════════════════════════════════════════════════════════

const GST_RATE = 0.05; // 5% GST

const IMAGE_DEFAULTS = {
  FALLBACK_URL: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&h=120&fit=crop',
  CACHE_DIR: 'public/images/menu',
};

const ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled', 'Paid'];

const CURRENCY = 'INR';

module.exports = {
  GST_RATE,
  IMAGE_DEFAULTS,
  ORDER_STATUSES,
  CURRENCY,
};
