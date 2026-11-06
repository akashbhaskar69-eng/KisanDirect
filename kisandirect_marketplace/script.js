'use strict';

const STORAGE_KEYS = {
  cart: 'kisandirect.cart.v2',
  saved: 'kisandirect.saved.v2',
  token: 'kisandirect.session.v1'
};

const starterProducts = [
  { id: 'p1', name: 'Farm-fresh tomatoes', category: 'Vegetables', price: 28, unit: 'kg', quantity: 40, farmer: 'Rina Family Farm', location: 'Durgapur, WB', description: 'Ripe, juicy tomatoes picked this morning.', emoji: '🍅', tone: 'tomato', tag: 'HARVEST TODAY', createdAt: 1 },
  { id: 'p2', name: 'Sweet red apples', category: 'Fruits', price: 110, unit: 'kg', quantity: 18, farmer: 'Himalayan Orchard', location: 'Kalimpong, WB', description: 'Crisp apples from a small hillside orchard.', emoji: '🍎', tone: 'apple', tag: 'SEASONAL', createdAt: 2 },
  { id: 'p3', name: 'Green spinach', category: 'Vegetables', price: 20, unit: 'bunch', quantity: 35, farmer: 'Maya’s Green Patch', location: 'Bardhaman, WB', description: 'Tender leafy greens, freshly bundled.', emoji: '🥬', tone: 'spinach', tag: 'FRESH PICK', createdAt: 3 },
  { id: 'p4', name: 'Golden sweet corn', category: 'Vegetables', price: 25, unit: 'piece', quantity: 50, farmer: 'Sanjay Organic Farm', location: 'Panagarh, WB', description: 'Sweet kernels, perfect for a quick snack.', emoji: '🌽', tone: 'corn', tag: 'FARM FAVOURITE', createdAt: 4 },
  { id: 'p5', name: 'Naturally sweet bananas', category: 'Fruits', price: 42, unit: 'dozen', quantity: 22, farmer: 'Anand Family Orchard', location: 'Bankura, WB', description: 'Naturally ripened bananas for the family.', emoji: '🍌', tone: 'banana', tag: 'GREAT VALUE', createdAt: 5 },
  { id: 'p6', name: 'Whole wheat atta', category: 'Grains', price: 48, unit: 'kg', quantity: 65, farmer: 'Mitra Grain Collective', location: 'Birbhum, WB', description: 'Locally milled whole wheat flour.', emoji: '🌾', tone: 'grain', tag: 'LOCAL GRAIN', createdAt: 6 },
  { id: 'p7', name: 'Fresh farm carrots', category: 'Vegetables', price: 35, unit: 'kg', quantity: 27, farmer: 'Rina Family Farm', location: 'Durgapur, WB', description: 'Crunchy carrots with a naturally sweet taste.', emoji: '🥕', tone: 'carrot', tag: 'FRESH PICK', createdAt: 7 },
  { id: 'p8', name: 'Farm-fresh milk', category: 'Dairy', price: 32, unit: 'litre', quantity: 16, farmer: 'Green Meadow Dairy', location: 'Andal, WB', description: 'Fresh local dairy listing. Keep refrigerated.', emoji: '🥛', tone: 'milk', tag: 'LOCAL DAIRY', createdAt: 8 }
];

const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const categoryRow = document.getElementById('category-row');
const resultsCount = document.getElementById('results-count');
const emptyState = document.getElementById('empty-state');
const cartCount = document.getElementById('cart-count');
const cartHeadingCount = document.getElementById('cart-heading-count');
const cartDrawer = document.getElementById('cart-drawer');
const cartBackdrop = document.getElementById('cart-backdrop');
const cartItemsElement = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartFooter = document.getElementById('cart-footer');
const cartTotal = document.getElementById('cart-total');
const sellModal = document.getElementById('sell-modal');
const sellForm = document.getElementById('sell-form');
const toastElement = document.getElementById('toast');
const accountModal = document.getElementById('account-modal');
const checkoutModal = document.getElementById('checkout-modal');
const authForm = document.getElementById('auth-form');

let activeCategory = 'All';
let toastTimeout = null;
let storageWarningShown = false;
let backendAvailable = false;
let currentUser = null;
let products = starterProducts.map((product) => ({ ...product }));
let cart = readStorage(STORAGE_KEYS.cart, {});
let savedProducts = readStorage(STORAGE_KEYS.saved, []);
if (!cart || Array.isArray(cart) || typeof cart !== 'object') cart = {};
if (!Array.isArray(savedProducts)) savedProducts = [];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read ${key} from localStorage.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage.`, error);
    if (!storageWarningShown) {
      storageWarningShown = true;
      showToast('Browser storage is unavailable; changes may not persist after refresh.');
    }
    return false;
  }
}

function getToken() {
  try { return localStorage.getItem(STORAGE_KEYS.token) || ''; }
  catch (_error) { return ''; }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    else localStorage.removeItem(STORAGE_KEYS.token);
  } catch (error) {
    console.warn('Could not store the sign-in session.', error);
    showToast('Browser storage is unavailable. Your sign-in may not survive refresh.');
  }
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(`/api${path}`, { ...options, headers, body });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : {};
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatRupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: Number(value) % 1 === 0 ? 0 : 2
  }).format(Number(value) || 0);
}

function productToneClass(tone) {
  const allowedTones = ['tomato', 'apple', 'spinach', 'corn', 'banana', 'grain', 'carrot', 'milk', 'custom'];
  return allowedTones.includes(tone) ? `tone-${tone}` : 'tone-custom';
}

function filteredProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const filtered = products.filter((product) => {
    const categoryMatches = activeCategory === 'All' || product.category === activeCategory;
    const searchable = [product.name, product.farmer, product.location, product.category, product.description].join(' ').toLocaleLowerCase();
    return categoryMatches && (!query || searchable.includes(query));
  });
  const sortValue = sortSelect.value;
  if (sortValue === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (sortValue === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (sortValue === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sortValue === 'recommended') filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return filtered;
}

function renderProducts() {
  const visibleProducts = filteredProducts();
  resultsCount.textContent = `Showing ${visibleProducts.length} of ${products.length} listing${products.length === 1 ? '' : 's'}`;
  emptyState.hidden = visibleProducts.length > 0;
  productGrid.hidden = visibleProducts.length === 0;
  productGrid.innerHTML = visibleProducts.map((product) => {
    const stock = Math.max(0, Number(product.quantity) || 0);
    const isSaved = savedProducts.includes(product.id);
    const categoryLabel = escapeHTML(product.category || 'Produce');
    const visual = product.imageUrl
      ? `<img class="product-photo" src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" loading="lazy" />`
      : `<span class="product-emoji" role="img" aria-label="${escapeHTML(product.name)}">${escapeHTML(product.emoji || '🌱')}</span>`;
    return `
      <article class="product-card">
        <div class="product-visual ${productToneClass(product.tone)}">
          <span class="product-tag">${escapeHTML(product.tag || (product.isSample ? 'SAMPLE LISTING' : 'FARM LISTING'))}</span>
          <button class="save-product ${isSaved ? 'saved' : ''}" type="button" data-save="${escapeHTML(product.id)}" aria-label="${isSaved ? 'Remove from' : 'Add to'} saved produce" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button>
          ${visual}
        </div>
        <div class="product-details">
          <div class="product-category">${categoryLabel}</div>
          <div class="product-name-row"><h3 class="product-name">${escapeHTML(product.name)}</h3><div class="product-price">${formatRupees(Number(product.price) || 0)}<small> / ${escapeHTML(product.unit || 'unit')}</small></div></div>
          <p class="product-description">${escapeHTML(product.description || 'Fresh produce listed by a local grower.')}</p>
          <div class="farmer-line"><span class="farmer-avatar" aria-hidden="true">👩🏽‍🌾</span><span class="farmer-meta"><strong>${escapeHTML(product.farmer || 'Local farmer')}</strong><small>⌖ ${escapeHTML(product.location || 'Local area')}</small></span><span class="stock-pill">${stock > 0 ? `${stock} ${escapeHTML(product.unit || 'units')} left` : 'Sold out'}</span></div>
          <button class="product-buy" type="button" data-add="${escapeHTML(product.id)}" ${stock <= 0 ? 'disabled' : ''}>${stock <= 0 ? 'Currently unavailable' : '<span aria-hidden="true">＋</span> Add to basket'}</button>
        </div>
      </article>`;
  }).join('');
}

function getCartQuantity() {
  return Object.values(cart).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0);
}

function renderCart() {
  const validCartEntries = Object.entries(cart).filter(([id, quantity]) => products.some((product) => product.id === id) && Number(quantity) > 0);
  cart = Object.fromEntries(validCartEntries);
  writeStorage(STORAGE_KEYS.cart, cart);
  const quantityTotal = getCartQuantity();
  cartCount.textContent = String(quantityTotal);
  cartHeadingCount.textContent = `(${quantityTotal})`;
  const items = validCartEntries.map(([id, quantity]) => ({ product: products.find((product) => product.id === id), quantity: Number(quantity) }));
  cartEmpty.hidden = items.length > 0;
  cartFooter.hidden = items.length === 0;
  cartItemsElement.innerHTML = items.map(({ product, quantity }) => `
    <article class="cart-item">
      <div class="cart-item-visual ${productToneClass(product.tone)}" aria-hidden="true">${product.imageUrl ? `<img class="cart-product-photo" src="${escapeHTML(product.imageUrl)}" alt="" />` : escapeHTML(product.emoji || '🌱')}</div>
      <div><h3>${escapeHTML(product.name)}</h3><p>${formatRupees(Number(product.price) || 0)} / ${escapeHTML(product.unit || 'unit')}</p>
        <div class="quantity-controls" aria-label="Quantity for ${escapeHTML(product.name)}"><button type="button" data-quantity="${escapeHTML(product.id)}" data-delta="-1" aria-label="Remove one">−</button><span>${quantity}</span><button type="button" data-quantity="${escapeHTML(product.id)}" data-delta="1" aria-label="Add one" ${quantity >= Number(product.quantity) ? 'disabled' : ''}>＋</button></div>
      </div><div class="cart-item-price">${formatRupees((Number(product.price) || 0) * quantity)}</div>
    </article>`).join('');
  const total = items.reduce((sum, item) => sum + (Number(item.product.price) || 0) * item.quantity, 0);
  cartTotal.textContent = formatRupees(total);
}

function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  if (toastTimeout) window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toastElement.classList.remove('show'), 3000);
}

async function loadProducts(showFailureToast = false) {
  try {
    const data = await apiRequest('/products');
    if (!Array.isArray(data.products)) throw new Error('Product list response was not valid.');
    products = data.products;
    backendAvailable = true;
  } catch (error) {
    backendAvailable = false;
    products = starterProducts.map((product) => ({ ...product }));
    if (showFailureToast) showToast(`Backend unavailable: ${error.message}`);
    else console.warn('Using sample listings until the API is connected:', error.message);
  }
  renderProducts();
  renderCart();
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const currentQuantity = Number(cart[productId]) || 0;
  if (currentQuantity >= Number(product.quantity)) {
    showToast('That listing does not have more quantity available.');
    return;
  }
  cart[productId] = currentQuantity + 1;
  writeStorage(STORAGE_KEYS.cart, cart);
  renderCart();
  showToast(`${product.name} added to your basket.`);
}

function changeCartQuantity(productId, delta) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const nextQuantity = (Number(cart[productId]) || 0) + delta;
  if (nextQuantity <= 0) delete cart[productId];
  else if (nextQuantity <= Number(product.quantity)) cart[productId] = nextQuantity;
  else showToast('You have reached the available quantity for this listing.');
  writeStorage(STORAGE_KEYS.cart, cart);
  renderCart();
  renderProducts();
}

function openCart() {
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartBackdrop.hidden = false;
  document.body.classList.add('modal-open');
  document.getElementById('close-cart').focus();
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartBackdrop.hidden = true;
  if (sellModal.hidden && accountModal.hidden && checkoutModal.hidden) document.body.classList.remove('modal-open');
}

function openSellModal() {
  if (!currentUser) {
    setAuthMode('register');
    document.getElementById('account-role').value = 'farmer';
    updateFarmerFields();
    openAccountModal();
    showToast('Create a farmer account before publishing a listing.');
    return;
  }
  if (currentUser.role !== 'farmer') {
    showToast('You are signed in as a buyer. Sign out and create a farmer account to sell produce.');
    return;
  }
  if (!backendAvailable) {
    showToast('Connect MongoDB before publishing shared farmer listings.');
    return;
  }
  sellModal.hidden = false;
  document.body.classList.add('modal-open');
  const firstInput = sellForm.querySelector('input[name="name"]');
  if (firstInput) firstInput.focus();
}

function closeSellModal() {
  sellModal.hidden = true;
  if (cartDrawer.classList.contains('open') || !accountModal.hidden || !checkoutModal.hidden) return;
  document.body.classList.remove('modal-open');
}

function closeAccountModal() {
  accountModal.hidden = true;
  if (sellModal.hidden && checkoutModal.hidden && !cartDrawer.classList.contains('open')) document.body.classList.remove('modal-open');
}

function closeCheckoutModal() {
  checkoutModal.hidden = true;
  if (sellModal.hidden && accountModal.hidden && !cartDrawer.classList.contains('open')) document.body.classList.remove('modal-open');
}

function setAuthMode(mode) {
  const isRegister = mode === 'register';
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });
  document.getElementById('register-fields').hidden = !isRegister;
  document.getElementById('confirm-password-label').hidden = !isRegister;
  document.getElementById('confirm-password-label').querySelector('input').required = isRegister;
  document.getElementById('auth-submit').textContent = isRegister ? 'Create free account' : 'Sign in';
  document.getElementById('account-title').textContent = isRegister ? 'Join KisanDirect' : 'Welcome back';
  document.getElementById('account-subtitle').textContent = isRegister ? 'Create a free buyer or farmer account.' : 'Sign in to access your marketplace account.';
  document.getElementById('account-message').textContent = '';
}

function updateFarmerFields() {
  const isFarmer = document.getElementById('account-role').value === 'farmer';
  const fields = document.getElementById('farmer-fields');
  fields.hidden = !isFarmer;
  fields.querySelector('input[name="farmName"]').required = isFarmer;
  fields.querySelector('input[name="location"]').required = isFarmer;
}

function updateAccountUI() {
  const accountButton = document.getElementById('account-button');
  if (currentUser) {
    accountButton.textContent = currentUser.name.split(' ')[0] || 'Account';
    document.getElementById('auth-forms').hidden = true;
    document.getElementById('account-panel').hidden = false;
    document.getElementById('account-title').textContent = 'Your account';
    document.getElementById('account-subtitle').textContent = 'Your KisanDirect marketplace profile.';
    document.getElementById('signed-in-name').textContent = currentUser.name;
    document.getElementById('signed-in-meta').textContent = `${currentUser.role === 'farmer' ? 'Farmer' : 'Buyer'} · ${currentUser.email}${currentUser.farmName ? ` · ${currentUser.farmName}` : ''}`;
  } else {
    accountButton.textContent = 'Sign in';
    document.getElementById('auth-forms').hidden = false;
    document.getElementById('account-panel').hidden = true;
  }
}

function openAccountModal() {
  updateAccountUI();
  accountModal.hidden = false;
  document.body.classList.add('modal-open');
  if (!currentUser) document.querySelector('#auth-form input[name="email"]').focus();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const formData = new FormData(authForm);
  const mode = document.querySelector('[data-auth-mode].active')?.dataset.authMode || 'login';
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const messageElement = document.getElementById('account-message');
  const submitButton = document.getElementById('auth-submit');
  messageElement.textContent = '';
  submitButton.disabled = true;
  try {
    let data;
    if (mode === 'register') {
      const confirmPassword = String(formData.get('confirmPassword') || '');
      if (password !== confirmPassword) throw new Error('Passwords do not match.');
      data = await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: String(formData.get('name') || '').trim(),
          email,
          password,
          role: String(formData.get('role') || 'buyer'),
          phone: String(formData.get('phone') || '').trim(),
          farmName: String(formData.get('farmName') || '').trim(),
          location: String(formData.get('location') || '').trim()
        }
      });
    } else {
      data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
    }
    setToken(data.token);
    currentUser = data.user;
    backendAvailable = true;
    updateAccountUI();
    await loadProducts();
    showToast(mode === 'register' ? 'Your KisanDirect account has been created.' : 'Signed in successfully.');
  } catch (error) {
    messageElement.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

async function signOut() {
  setToken('');
  currentUser = null;
  document.getElementById('my-orders-list').innerHTML = '';
  updateAccountUI();
  closeAccountModal();
  showToast('You have signed out.');
}

async function showMyOrders() {
  const container = document.getElementById('my-orders-list');
  container.innerHTML = '<p class="form-footnote">Loading your orders…</p>';
  try {
    const data = await apiRequest('/orders/mine');
    if (!data.orders.length) {
      container.innerHTML = '<p class="form-footnote">No orders yet. Orders placed in demo checkout will appear here.</p>';
      return;
    }
    container.innerHTML = data.orders.map((order) => `
      <article class="order-card">
        <strong>${escapeHTML(order.orderNumber)}</strong>
        <p>${order.items.map((item) => `${escapeHTML(item.productName)} × ${item.quantity} ${escapeHTML(item.unit)}`).join('<br>')}</p>
        <p>${currentUser.role === 'farmer' ? `Buyer: ${escapeHTML(order.buyerName || 'Marketplace buyer')} · ` : ''}Total: ${formatRupees(order.total)}</p>
        <small>${escapeHTML(order.status)} · Demo payment (no money collected) · ${new Date(order.createdAt).toLocaleString('en-IN')}</small>
      </article>`).join('');
  } catch (error) {
    container.innerHTML = `<p class="account-message">${escapeHTML(error.message)}</p>`;
  }
}

async function uploadProductImage(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WEBP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  const payload = new FormData();
  payload.append('image', file);
  const data = await apiRequest('/uploads/image', { method: 'POST', body: payload });
  return data.imageUrl;
}

async function handleSellSubmit(event) {
  event.preventDefault();
  if (!sellForm.reportValidity()) return;
  if (!currentUser || currentUser.role !== 'farmer') {
    showToast('Sign in with a farmer account to publish produce.');
    return;
  }
  if (!backendAvailable) {
    showToast('The database is offline. Your listing has not been published.');
    return;
  }

  const data = new FormData(sellForm);
  const submitButton = sellForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Publishing…';
  try {
    let imageUrl = '';
    const imageFile = data.get('image');
    if (imageFile && imageFile.size > 0) {
      try {
        imageUrl = await uploadProductImage(imageFile);
      } catch (imageError) {
        showToast(`${imageError.message} Publishing without a photo.`);
      }
    }
    const payload = {
      name: String(data.get('name') || '').trim(),
      category: String(data.get('category') || 'Vegetables'),
      price: Number(data.get('price')),
      quantity: Number(data.get('quantity')),
      unit: String(data.get('unit') || 'kg'),
      description: String(data.get('description') || '').trim(),
      imageUrl
    };
    if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0 || !Number.isInteger(payload.quantity) || payload.quantity <= 0) {
      throw new Error('Please enter a valid name, price and whole-number quantity.');
    }
    const result = await apiRequest('/products', { method: 'POST', body: payload });
    products.unshift(result.product);
    renderProducts();
    renderCart();
    resetFilters();
    sellForm.reset();
    closeSellModal();
    showToast('Your produce listing is now live in the shared marketplace.');
    document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Publish listing <span>→</span>';
  }
}

function openCheckout() {
  if (getCartQuantity() === 0) {
    showToast('Your basket is empty.');
    return;
  }
  if (!currentUser) {
    setAuthMode('register');
    document.getElementById('account-role').value = 'buyer';
    updateFarmerFields();
    openAccountModal();
    showToast('Create a free buyer account before placing an order.');
    return;
  }
  if (!backendAvailable) {
    showToast('Connect the marketplace database before placing an online order.');
    return;
  }
  closeCart();
  checkoutModal.hidden = false;
  document.body.classList.add('modal-open');
  checkoutModal.querySelector('textarea').focus();
}

async function handleCheckout(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Saving demo order…';
  try {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));
    const result = await apiRequest('/orders', {
      method: 'POST',
      body: { items, deliveryAddress: String(new FormData(form).get('deliveryAddress') || '').trim() }
    });
    cart = {};
    writeStorage(STORAGE_KEYS.cart, cart);
    renderCart();
    closeCheckoutModal();
    form.reset();
    await loadProducts();
    showToast(`${result.order.orderNumber}: demo order saved. No real payment was taken.`);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Confirm demo order →';
  }
}

function toggleSaved(productId) {
  if (savedProducts.includes(productId)) {
    savedProducts = savedProducts.filter((id) => id !== productId);
    showToast('Removed from your saved produce.');
  } else {
    savedProducts.push(productId);
    showToast('Saved for later.');
  }
  writeStorage(STORAGE_KEYS.saved, savedProducts);
  renderProducts();
}

function resetFilters() {
  activeCategory = 'All';
  searchInput.value = '';
  sortSelect.value = 'recommended';
  categoryRow.querySelectorAll('[data-category]').forEach((button) => {
    button.classList.toggle('active', button.dataset.category === 'All');
  });
  renderProducts();
}

productGrid.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add]');
  const saveButton = event.target.closest('[data-save]');
  if (addButton) addToCart(addButton.dataset.add);
  if (saveButton) toggleSaved(saveButton.dataset.save);
});

categoryRow.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  categoryRow.querySelectorAll('[data-category]').forEach((chip) => chip.classList.toggle('active', chip === button));
  renderProducts();
});

searchInput.addEventListener('input', renderProducts);
sortSelect.addEventListener('change', renderProducts);
document.getElementById('reset-filters').addEventListener('click', resetFilters);
document.getElementById('open-cart').addEventListener('click', openCart);
document.getElementById('close-cart').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.getElementById('continue-shopping').addEventListener('click', () => {
  closeCart();
  document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
});
cartItemsElement.addEventListener('click', (event) => {
  const button = event.target.closest('[data-quantity]');
  if (button) changeCartQuantity(button.dataset.quantity, Number(button.dataset.delta));
});
document.getElementById('clear-cart').addEventListener('click', () => {
  cart = {};
  writeStorage(STORAGE_KEYS.cart, cart);
  renderCart();
  showToast('Your basket has been cleared.');
});
document.getElementById('checkout-button').addEventListener('click', openCheckout);

document.querySelectorAll('.sell-trigger').forEach((button) => button.addEventListener('click', openSellModal));
document.querySelectorAll('.close-modal').forEach((button) => button.addEventListener('click', closeSellModal));
sellModal.addEventListener('click', (event) => { if (event.target === sellModal) closeSellModal(); });
sellForm.addEventListener('submit', handleSellSubmit);

document.getElementById('account-button').addEventListener('click', openAccountModal);
document.getElementById('close-account').addEventListener('click', closeAccountModal);
accountModal.addEventListener('click', (event) => { if (event.target === accountModal) closeAccountModal(); });
document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
document.getElementById('account-role').addEventListener('change', updateFarmerFields);
authForm.addEventListener('submit', handleAuthSubmit);
document.getElementById('logout-button').addEventListener('click', signOut);
document.getElementById('my-orders-button').addEventListener('click', showMyOrders);

document.getElementById('close-checkout').addEventListener('click', closeCheckoutModal);
document.getElementById('cancel-checkout').addEventListener('click', closeCheckoutModal);
checkoutModal.addEventListener('click', (event) => { if (event.target === checkoutModal) closeCheckoutModal(); });
document.getElementById('checkout-form').addEventListener('submit', handleCheckout);

document.getElementById('menu-toggle').addEventListener('click', () => {
  const nav = document.querySelector('.main-nav');
  const isOpen = nav.classList.toggle('open');
  document.getElementById('menu-toggle').setAttribute('aria-expanded', String(isOpen));
});
document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  document.querySelector('.main-nav').classList.remove('open');
  document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
}));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSellModal();
    closeCart();
    closeAccountModal();
    closeCheckoutModal();
    document.querySelector('.main-nav').classList.remove('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
  }
  if (event.key === 'Enter' && document.activeElement === searchInput) {
    event.preventDefault();
    document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
  }
});

async function bootstrap() {
  renderProducts();
  await loadProducts();
  const token = getToken();
  if (token) {
    try {
      const data = await apiRequest('/auth/me');
      currentUser = data.user;
      backendAvailable = true;
    } catch (error) {
      console.warn('Saved session could not be restored:', error.message);
      setToken('');
      currentUser = null;
    }
  }
  updateAccountUI();
}

bootstrap();
