// ═══════════════════════════════════════════════════════════
//  js/orders.js  —  User orders page
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireLogin('login.html');
  if (!user) return;

  const userNameEl = document.getElementById('orders-user-name');
  if (userNameEl) userNameEl.textContent = user.name;

  await loadOrders();

  // Poll for status updates every 30 seconds
  setInterval(loadOrders, 30000);
});

async function loadOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  const res = await api.get('orders/my-orders');
  if (!res.success) {
    showEmpty(container, '⚠️', 'Could not load orders', res.message);
    return;
  }

  const orders = res.data;
  if (!orders.length) {
    showEmpty(container, '📋', 'No orders yet', 'Place your first order from the menu!');
    return;
  }

  container.innerHTML = orders.map(order => orderCardHTML(order)).join('');
}

function orderCardHTML(order) {
  const statusClass = `status-${order.status}`;
  const itemsList   = order.items.map(i =>
    `<div class="order-item-row">
       <span>${i.name} × ${i.quantity}</span>
       <span>${formatPrice(i.unit_price * i.quantity)}</span>
     </div>`
  ).join('');

  const statusSteps  = ['Pending','Preparing','Ready','Delivered'];
  const stepIdx      = statusSteps.indexOf(order.status);
  const progressBar  = order.status !== 'Cancelled' ? `
    <div style="margin:1rem 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
        ${statusSteps.map((s,i) => `
          <span style="font-size:.72rem;font-weight:600;color:${i<=stepIdx?'var(--accent)':'var(--primary-300)'};text-align:center;flex:1;">${s}</span>
        `).join('')}
      </div>
      <div style="height:6px;background:var(--primary-100);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${Math.max(8,(stepIdx/(statusSteps.length-1))*100)}%;background:var(--accent);border-radius:3px;transition:width .5s;"></div>
      </div>
    </div>` : '';

  return `
  <div class="order-card fade-in">
    <div class="order-card__header" onclick="toggleOrder(${order.id})">
      <div>
        <div class="order-card__id">Order #${order.id}${order.table_no ? ` — Table ${order.table_no}` : ''}</div>
        <div class="order-card__date">${formatDate(order.created_at)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:.75rem;">
        <span class="status-badge ${statusClass}">${statusDot(order.status)} ${order.status}</span>
        <span style="color:var(--primary-500);font-size:1.1rem;" id="chevron-${order.id}">▼</span>
      </div>
    </div>
    <div class="order-card__body" id="order-body-${order.id}">
      ${progressBar}
      <div style="margin-bottom:.5rem;">${itemsList}</div>
      <div class="order-total-row">
        <span>Total</span>
        <span style="color:var(--accent);">${formatPrice(order.total_price)}</span>
      </div>
      ${order.notes ? `<div style="margin-top:.75rem;font-size:.85rem;color:var(--primary-500);">📝 Note: ${order.notes}</div>` : ''}
    </div>
  </div>`;
}

function toggleOrder(id) {
  const body    = document.getElementById(`order-body-${id}`);
  const chevron = document.getElementById(`chevron-${id}`);
  if (!body) return;
  body.classList.toggle('open');
  if (chevron) chevron.textContent = body.classList.contains('open') ? '▲' : '▼';
}

function statusDot(status) {
  const map = { Pending:'🟡', Preparing:'🔵', Ready:'🟢', Delivered:'⚫', Cancelled:'🔴' };
  return map[status] || '⚪';
}
