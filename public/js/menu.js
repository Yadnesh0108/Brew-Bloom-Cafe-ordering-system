// ═══════════════════════════════════════════════════════════
//  js/menu.js  —  Menu page logic
// ═══════════════════════════════════════════════════════════

let allItems      = [];
let allCategories = [];
let activeCategory = 0;
let searchQuery   = '';

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadMenu();

  // Search
  const searchInput = document.getElementById('menu-search');
  const searchBtn   = document.getElementById('menu-search-btn');
  if (searchInput) {
    searchInput.addEventListener('input', e => { searchQuery = e.target.value.trim(); renderMenu(); });
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') renderMenu(); });
  }
  if (searchBtn) searchBtn.addEventListener('click', renderMenu);
});

// ── Load categories ─────────────────────────────────────────
async function loadCategories() {
  const res = await api.get('menu/categories');
  if (!res.success) return;
  allCategories = res.data;

  const bar = document.getElementById('category-bar');
  if (!bar) return;

  bar.innerHTML = `<button class="cat-btn active" data-id="0" onclick="filterCategory(0, this)">🍽️ All</button>`;
  allCategories.forEach(cat => {
    bar.innerHTML += `<button class="cat-btn" data-id="${cat.id}" onclick="filterCategory(${cat.id}, this)">
      ${cat.icon} ${cat.name}
    </button>`;
  });
}

// ── Load all menu items ─────────────────────────────────────
async function loadMenu() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  showSpinner(grid);

  const res = await api.get('menu');
  if (!res.success) {
    showEmpty(grid, '☕', 'Could not load menu', 'Please refresh the page.');
    return;
  }
  allItems = getVisibleMenuItems(res.data || []);
  renderMenu();
}

// ── Filter by category ──────────────────────────────────────
function filterCategory(id, btn) {
  activeCategory = id;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMenu();
}

// ── Render items ────────────────────────────────────────────
function renderMenu() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  let items = allItems;
  if (activeCategory) items = items.filter(i => i.category_id == activeCategory);
  if (searchQuery)    items = items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!items.length) {
    showEmpty(grid, '🔍', 'No items found', 'Try a different category or search term.');
    return;
  }

  grid.innerHTML = items.map(item => menuCardHTML(item)).join('');
}

// ── Card HTML ───────────────────────────────────────────────
function menuCardHTML(item) {
  const imgSrc = item.resolved_image || getMenuImageSrc(item);
  if (!imgSrc) return '';
  const tagline = item.description ? item.description.split('.')[0] + '.' : item.category_name;
  return `
  <div class="card menu-card fade-in">
    <div class="menu-card__img">
      <img src="${imgSrc}"
           onerror="this.style.display='none';"
           alt="${item.name}" loading="lazy">
      <span class="menu-card__badge">${item.category_icon || '☕'} ${item.category_name}</span>
      <div class="menu-card__caption">
        <h4>${item.name}</h4>
        <span>${tagline}</span>
      </div>
    </div>
    <div class="menu-card__body">
      <div class="menu-card__desc">${item.description || ''}</div>
      <div class="menu-card__footer">
        <span class="menu-card__price">${formatPrice(item.price)}</span>
        <button class="add-to-cart-btn" onclick="addItemToCart(${item.id}, '${escapeStr(item.name)}', ${item.price}, '${escapeStr(imgSrc)}', '${escapeStr(item.category_name)}')">
          🛒 Add
        </button>
      </div>
    </div>
  </div>`;
}

function escapeStr(s) { return String(s).replace(/'/g, "\\'"); }

function addItemToCart(id, name, price, image, category) {
  Cart.add({ menu_id: id, name, price, image, category });
}
