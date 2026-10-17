'use strict';

const STORAGE_KEYS = {
  products: 'kisandirect.products.v1',
  cart: 'kisandirect.cart.v1',
  saved: 'kisandirect.saved.v1'
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

let activeCategory = 'All';
let toastTimeout = null;
let storageWarningShown = false;

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read ${key} from localStorage. Using a temporary default.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage. Changes will last only for this session.`, error);
    if (!storageWarningShown) {
      storageWarningShown = true;
      showToast('Browser storage is unavailable; changes may not persist after refresh.');
    }
    return false;
  }
}

function cloneStarterProducts() {
  return starterProducts.map((product) => ({ ...product }));
}

let products = readStorage(STORAGE_KEYS.products, null);
if (!Array.isArray(products) || products.length === 0) {
  products = cloneStarterProducts();
  writeStorage(STORAGE_KEYS.products, products);
}
let cart = readStorage(STORAGE_KEYS.cart, {});
if (!cart || Array.isArray(cart) || typeof cart !== 'object') cart = {};
let savedProducts = readStorage(STORAGE_KEYS.saved, []);
if (!Array.isArray(savedProducts)) savedProducts = [];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatRupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
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
    return `
      <article class="product-card">
        <div class="product-visual ${productToneClass(product.tone)}">
          <span class="product-tag">${escapeHTML(product.tag || 'FARM LISTING')}</span>
          <button class="save-product ${isSaved ? 'saved' : ''}" type="button" data-save="${escapeHTML(product.id)}" aria-label="${isSaved ? 'Remove from' : 'Add to'} saved produce" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button>
          <span class="product-emoji" role="img" aria-label="${escapeHTML(product.name)}">${escapeHTML(product.emoji || '🌱')}</span>
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
      <div class="cart-item-visual ${productToneClass(product.tone)}" aria-hidden="true">${escapeHTML(product.emoji || '🌱')}</div>
      <div><h3>${escapeHTML(product.name)}</h3><p>${formatRupees(Number(product.price) || 0)} / ${escapeHTML(product.unit || 'unit')}</p>
        <div class="quantity-controls" aria-label="Quantity for ${escapeHTML(product.name)}"><button type="button" data-quantity="${escapeHTML(product.id)}" data-delta="-1" aria-label="Remove one">−</button><span>${quantity}</span><button type="button" data-quantity="${escapeHTML(product.id)}" data-delta="1" aria-label="Add one" ${quantity >= Number(product.quantity) ? 'disabled' : ''}>＋</button></div>
      </div><div class="cart-item-price">${formatRupees((Number(product.price) || 0) * quantity)}</div>
    </article>`).join('');
  const total = items.reduce((sum, item) => sum + (Number(item.product.price) || 0) * item.quantity, 0);
  cartTotal.textContent = formatRupees(total);
}

function saveProducts() {
  writeStorage(STORAGE_KEYS.products, products);
}

function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  if (toastTimeout) window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toastElement.classList.remove('show'), 2800);
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
  if (sellModal.hidden) document.body.classList.remove('modal-open');
}

function openSellModal() {
  sellModal.hidden = false;
  document.body.classList.add('modal-open');
  const firstInput = sellForm.querySelector('input[name="name"]');
  if (firstInput) firstInput.focus();
}

function closeSellModal() {
  sellModal.hidden = true;
  if (!cartDrawer.classList.contains('open')) document.body.classList.remove('modal-open');
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

document.getElementById('checkout-button').addEventListener('click', () => {
  if (getCartQuantity() === 0) {
    showToast('Your basket is empty.');
    return;
  }
  cart = {};
  writeStorage(STORAGE_KEYS.cart, cart);
  renderCart();
  renderProducts();
  closeCart();
  showToast('Demo order placed! No payment was taken.');
});

document.querySelectorAll('.sell-trigger').forEach((button) => button.addEventListener('click', openSellModal));
document.querySelectorAll('.close-modal').forEach((button) => button.addEventListener('click', closeSellModal));
sellModal.addEventListener('click', (event) => {
  if (event.target === sellModal) closeSellModal();
});

sellForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!sellForm.reportValidity()) return;
  const formData = new FormData(sellForm);
  const name = String(formData.get('name') || '').trim();
  const category = String(formData.get('category') || 'Vegetables');
  const price = Number(formData.get('price'));
  const quantity = Number(formData.get('quantity'));
  const farmer = String(formData.get('farmer') || '').trim();
  const location = String(formData.get('location') || '').trim();
  const unit = String(formData.get('unit') || 'kg');
  const description = String(formData.get('description') || '').trim();
  if (!name || !farmer || !location || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
    showToast('Please enter valid listing details.');
    return;
  }
  const categoryDefaults = {
    Vegetables: { emoji: '🥦', tone: 'spinach' },
    Fruits: { emoji: '🍊', tone: 'apple' },
    Grains: { emoji: '🌾', tone: 'grain' },
    Dairy: { emoji: '🥛', tone: 'milk' }
  };
  const defaultVisual = categoryDefaults[category] || categoryDefaults.Vegetables;
  const newProduct = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name, category, price, quantity, farmer, location, unit,
    description: description || 'Freshly listed by a local grower.',
    emoji: defaultVisual.emoji, tone: defaultVisual.tone, tag: 'NEW LISTING', createdAt: Date.now()
  };
  products.unshift(newProduct);
  saveProducts();
  resetFilters();
  sellForm.reset();
  closeSellModal();
  showToast('Your produce listing is now visible in this demo.');
  document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
});

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
    document.querySelector('.main-nav').classList.remove('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
  }
  if (event.key === 'Enter' && document.activeElement === searchInput) {
    event.preventDefault();
    document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
  }
});

// Paint the page immediately from sample data, then keep the basket in sync.
renderProducts();
renderCart();
