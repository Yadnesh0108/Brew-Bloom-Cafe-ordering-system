// ═══════════════════════════════════════════════════════════
//  js/cart.js  —  Cart page logic
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  // Show cancelled toast if Stripe redirected back with ?cancelled=1
  if (new URLSearchParams(window.location.search).get('cancelled') === '1') {
    toast('Payment cancelled. Your cart is still saved.', 'warning', 4000);
    window.history.replaceState({}, '', 'cart.html');
  }
});

function renderCart() {
  const itemsEl   = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');
  const items     = Cart.getAll();

  if (!itemsEl) return;

  if (!items.length) {
    showEmpty(itemsEl, '🛒', 'Your cart is empty', 'Browse our menu and add some items!');
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  if (summaryEl) summaryEl.style.display = 'block';

  itemsEl.innerHTML = items.map(item => `
    <div class="cart-item fade-in" id="cart-row-${item.menu_id}">
      <img class="cart-item__img"
           src="${resolveCartImage(item.image)}"
           onerror="this.style.display='none'"
           alt="${item.name}">
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__price">${formatPrice(item.price)} each</div>
        <div class="cart-item__controls">
          <button class="qty-btn" onclick="changeQty(${item.menu_id}, -1)">−</button>
          <span class="qty-display" id="qty-${item.menu_id}">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${item.menu_id}, 1)">+</button>
          <button class="remove-btn" onclick="removeItem(${item.menu_id})" title="Remove">🗑️</button>
        </div>
      </div>
      <div style="font-family:var(--font-display);font-weight:600;color:var(--primary-700);font-size:1rem;flex-shrink:0;">
        ${formatPrice(item.price * item.quantity)}
      </div>
    </div>
  `).join('');

  updateSummary(items);
}

function resolveCartImage(image) {
  const raw = String(image || '').trim();
  if (!raw) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&h=120&fit=crop';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `backend/uploads/${raw}`;
}

function changeQty(menu_id, delta) {
  const items = Cart.getAll();
  const item  = items.find(i => i.menu_id === menu_id);
  if (!item) return;
  const newQty = item.quantity + delta;
  Cart.updateQty(menu_id, newQty);
  if (newQty < 1) {
    document.getElementById(`cart-row-${menu_id}`)?.remove();
  } else {
    const qtyEl = document.getElementById(`qty-${menu_id}`);
    if (qtyEl) qtyEl.textContent = newQty;
  }
  updateSummary(Cart.getAll());
  if (!Cart.count()) renderCart(); // show empty state
}

function removeItem(menu_id) {
  Cart.remove(menu_id);
  renderCart();
}

function updateSummary(items) {
  const subtotal = Cart.total();
  const tax      = subtotal * 0.05;  // 5% GST
  const total    = subtotal + tax;

  document.getElementById('summary-items')   && (document.getElementById('summary-items').textContent   = items.reduce((s,i) => s + i.quantity, 0) + ' items');
  document.getElementById('summary-subtotal')&& (document.getElementById('summary-subtotal').textContent = formatPrice(subtotal));
  document.getElementById('summary-tax')     && (document.getElementById('summary-tax').textContent      = formatPrice(tax));
  document.getElementById('summary-total')   && (document.getElementById('summary-total').textContent    = formatPrice(total));
}

// ── Cash Order (existing flow) ──────────────────────────────
async function placeOrder() {
  const user = await Auth.getUser();
  if (!user) {
    toast('Please log in to place an order.', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }

  const items = Cart.getAll();
  if (!items.length) { toast('Your cart is empty!', 'error'); return; }

  const tableNo = document.getElementById('table-no')?.value.trim() || '';
  const notes   = document.getElementById('order-notes')?.value.trim() || '';

  const orderPayload = {
    items: items.map(i => ({ menu_id: i.menu_id, quantity: i.quantity })),
    table_no: tableNo,
    notes
  };

  const btn = document.getElementById('place-order-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

  const res = await api.post('orders/place', orderPayload);

  if (res.success) {
    Cart.clear();
    toast(`Order #${res.data.order_id} placed successfully! 🎉`, 'success', 4000);
    setTimeout(() => window.location.href = 'orders.html', 1500);
  } else {
    toast(res.message || 'Order failed.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💵 Cash on Delivery'; }
  }
}

// ── Razorpay Payment ──────────────────────────────────────────
async function payWithRazorpay() {
  const user = await Auth.getUser();
  if (!user) {
    toast('Please log in to pay online.', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }

  const items = Cart.getAll();
  if (!items.length) { toast('Your cart is empty!', 'error'); return; }

  const tableNo = document.getElementById('table-no')?.value.trim() || '';
  const notes   = document.getElementById('order-notes')?.value.trim() || '';
  const upiId   = document.getElementById('upi-id')?.value.trim() || '';

  const btn = document.getElementById('razorpay-pay-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Initializing Payment…'; }

  // 1. Create order on the backend
  const res = await api.post('payment/create-order', {
    items: items.map(i => ({ menu_id: i.menu_id, quantity: i.quantity })),
    table_no: tableNo,
    notes: upiId ? notes + `\nUPI: ${upiId}` : notes
  });

  if (!res.success || !res.order_id) {
    toast(res.message || 'Could not start payment. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💳 Pay Online (Razorpay)'; }
    return;
  }

  // 2. Initialize Razorpay Checkout Modal
  const rzpOptions = {
    key: res.key_id,
    amount: res.amount,
    currency: "INR",
    name: "Brew & Bloom Cafe",
    description: "Your Order Payment",
    order_id: res.order_id,
    handler: async function (response) {
      if (btn) { btn.textContent = 'Verifying Payment…'; }
      // 3. Verify on the backend
      const verifyRes = await api.post('payment/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        items: items.map(i => ({ menu_id: i.menu_id, quantity: i.quantity })),
        table_no: tableNo,
        notes: upiId ? notes + `\nUPI: ${upiId}` : notes
      });

      if (verifyRes.success) {
        Cart.clear();
        window.location.href = `payment-success.html?order_id=${verifyRes.order_id}`;
      } else {
        toast('Payment verification failed. Please contact support.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '💳 Pay Online (Razorpay)'; }
      }
    },
    prefill: {
      name: user.name,
      email: user.email,
      contact: '',
    },
    theme: {
      color: "#4A5D4A"
    }
  };

  // Pre-select UPI method if UPI ID was entered
  if (upiId) {
    rzpOptions.method = 'upi';
    rzpOptions.upi = { flow: 'collect', vpa: upiId };
  }

  const rzp1 = new Razorpay(rzpOptions);
  rzp1.on('payment.failed', function (response){
      toast('Payment Failed: ' + response.error.description, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '💳 Pay Online (Razorpay)'; }
  });
  
  rzp1.open();
}
