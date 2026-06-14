// ═══════════════════════════════════════════════════════════
//  js/auth.js  —  Login & Register form handlers
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  redirectIfLoggedIn();
});

async function redirectIfLoggedIn() {
  const user = await Auth.getUser();
  if (user) window.location.href = 'index.html';
}

// ── Login ────────────────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = form.querySelector('[type=submit]');
    const email = form.email.value.trim();
    const pass  = form.password.value;

    if (!email || !pass) { toast('Please fill in all fields.', 'error'); return; }

    btn.disabled    = true;
    btn.textContent = 'Signing in…';

    const res = await api.post('login', { email, password: pass });

    if (res.success) {
      toast('Welcome back! 🎉', 'success', 2000);
      const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
      setTimeout(() => window.location.href = redirect, 800);
    } else {
      toast(res.message || 'Login failed.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Sign In';
    }
  });
}

// ── Register ─────────────────────────────────────────────────
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn    = form.querySelector('[type=submit]');
    const name   = form.fullname.value.trim();
    const email  = form.email.value.trim();
    const pass   = form.password.value;
    const pass2  = form.confirm_password.value;
    const role   = form.role ? form.role.value : 'user';

    if (!name || !email || !pass) { toast('All fields are required.', 'error'); return; }
    if (pass !== pass2)           { toast('Passwords do not match.', 'error');   return; }
    if (pass.length < 6)          { toast('Password must be at least 6 characters.', 'error'); return; }

    btn.disabled    = true;
    btn.textContent = 'Creating account…';

    const res = await api.post('register', { name, email, password: pass, role });

    if (res.success) {
      toast('Account created! Please log in.', 'success', 3000);
      setTimeout(() => window.location.href = 'login.html', 1200);
    } else {
      toast(res.message || 'Registration failed.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Create Account';
    }
  });
}
