// ═══════════════════════════════════════════════════════════
//  js/admin.js  —  Admin panel shared logic
// ═══════════════════════════════════════════════════════════

// ── Guard ────────────────────────────────────────────────────
async function requireAdminJs() {
  const user = await Auth.getUser();
  if (!user) { window.location.href = '../login.html'; return null; }
  if (user.role !== 'admin') { window.location.href = '../index.html'; return null; }

  const nameEl = document.getElementById('admin-name');
  if (nameEl) nameEl.textContent = user.name;
  return user;
}

// ── Sidebar toggle (mobile) ─────────────────────────────────
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}

// ── Active nav link ──────────────────────────────────────────
function setActiveNav() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar__nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || href.includes(path)) a.classList.add('active');
  });
}

// ── Status color helper ───────────────────────────────────────
function statusBadge(status) {
  return `<span class="status-badge status-${status}">${status}</span>`;
}

// ── Load categories for selects ──────────────────────────────
async function loadCategoryOptions(selectId, selectedId = 0) {
  const res = await fetch('/api/menu/categories', { credentials: 'same-origin' });
  const data = await res.json();
  const sel  = document.getElementById(selectId);
  if (!sel || !data.success) return;
  sel.innerHTML = '<option value="">Select category</option>' +
    data.data.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
}

// ── Image preview ────────────────────────────────────────────
function previewImage(inputId, previewId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { preview.src = ev.target.result; preview.style.display = 'block'; };
    reader.readAsDataURL(file);
  });
}

// ── Upload image via API ─────────────────────────────────────
async function uploadImage(inputId) {
  const input = document.getElementById(inputId);
  if (!input || !input.files[0]) return null;
  const form = new FormData();
  form.append('image', input.files[0]);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: form, credentials: 'same-origin' });
  const data = await res.json();
  return data.success ? data.data.filename : null;
}

// ── Confirm dialog ────────────────────────────────────────────
function confirmAction(msg, cb) {
  if (window.confirm(msg)) cb();
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  // Sidebar toggle button
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
});
