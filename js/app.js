/* ============================================
   BRAND — общая логика
   ============================================ */

// --- Конфиг магазина (легко меняется) ---
const SHOP_CONFIG = {
  currency: '₽',
  telegram: 'xpodium_russia',  // ник менеджера
  telegramUrl: 'https://t.me/xpodium_russia',
  freeShippingFrom: 10000,
};

// --- Хранилище корзины (без localStorage — в памяти, плюс window для страниц) ---
// Для демо в памяти. Для продакшена — заменить на window.storage (артефакт) или сервер.
let CART = (typeof window !== 'undefined' && window.__CART__) ? window.__CART__ : [];
if (typeof window !== 'undefined') window.__CART__ = CART;

// Пытаемся восстановить из sessionStorage если есть
try {
  const saved = sessionStorage.getItem('brand_cart');
  if (saved) { CART = JSON.parse(saved); window.__CART__ = CART; }
} catch(e) {}

function saveCart() {
  try { sessionStorage.setItem('brand_cart', JSON.stringify(CART)); } catch(e) {}
}

// --- Загрузка каталога ---
let PRODUCTS = [];
async function loadProducts() {
  if (PRODUCTS.length) return PRODUCTS;
  try {
    const res = await fetch('products.json');
    PRODUCTS = await res.json();
  } catch (e) {
    console.error('Ошибка загрузки products.json', e);
  }
  return PRODUCTS;
}

// --- Утилиты ---
function formatPrice(n) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ' + SHOP_CONFIG.currency;
}

// Маппинг русского цвета -> hex (для кружков-свотчей)
const COLOR_SWATCH = {
  'Чёрный': '#0a0a0a', 'Белый': '#ffffff', 'Серый': '#8a8a8a',
  'Зелёный': '#2d5a3d', 'Розовый': '#ffb6c1', 'Жёлтый': '#e8c547',
  'Синий': '#2a4a7a', 'Красный': '#b33030', 'Хаки': '#8b7d5a',
  'Тёмно-синий': '#1a2b4a', 'Голубой': '#8ab4d8', 'Кремовый': '#e8dcc4',
  'Мятный': '#a8d8c0', 'Оливковый': '#6b7a3d', 'Армейский зелёный': '#4a5a3a',
  'Коричневый мокко': '#5a3a2a', 'Коричневый': '#6b4423', 'Тёмно-красный': '#6b2020',
  'Тёмно-серый': '#3a3a3a', 'Серо-зелёный': '#7a8a6a',
  'Кофейный': '#3a2a1a', 'Золотой': '#c9a86a', 'Серебряный': '#b8b8b8',
  'Бордовый': '#5a1a2a', 'Оранжевый': '#e88530', 'Розово-красный': '#c8456a',
};
function getSwatchColor(colorName) {
  // если составной (Белый+Серый) — берём первый
  const first = colorName.split('+')[0].split('(')[0].trim();
  return COLOR_SWATCH[first] || '#cccccc';
}

// Путь к картинке товара. Поддерживает и имя файла, и полный путь.
function productImageUrl(img) {
  if (!img) return 'images/placeholder.svg';
  if (img.startsWith('http') || img.startsWith('/')) return img.replace(/^\//, '');
  return `images/products/${img}`;
}

// --- Рендер карточки товара ---
function renderProductCard(p) {
  const img = productImageUrl(p.images && p.images[0]);
  const colors = (p.colors || []).slice(0, 5).map(c =>
    `<span class="product-color" style="background:${getSwatchColor(c)}" title="${c}"></span>`
  ).join('');
  return `
    <div class="product-card" data-product-id="${p.id}" onclick="openProductModal('${p.id}')">
      <div class="product-img"><img src="${img}" alt="${p.name_ru}" loading="lazy"></div>
      <div class="product-brand">${p.brand}</div>
      <div class="product-name">${p.name_ru}</div>
      <div class="product-price">${formatPrice(p.price)}</div>
      ${colors ? `<div class="product-colors">${colors}</div>` : ''}
    </div>
  `;
}

// --- Модалка товара ---
function openProductModal(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;

  let selectedSize = p.sizes[0] || null;
  let selectedColor = p.colors[0] || null;
  const img = productImageUrl(p.images && p.images[0]);

  const sizesHtml = (p.sizes || []).map(s =>
    `<div class="pm-option pm-size ${s === selectedSize ? 'selected' : ''}" data-size="${s}">${s}</div>`
  ).join('');
  const colorsHtml = (p.colors || []).map(c =>
    `<div class="pm-option pm-color ${c === selectedColor ? 'selected' : ''}" data-color="${c}">
       <span class="product-color" style="background:${getSwatchColor(c)};display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:middle;border:1px solid rgba(0,0,0,0.15)"></span>${c}
     </div>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'product-modal open';
  modal.innerHTML = `
    <div class="product-modal-inner">
      <button class="pm-close" onclick="this.closest('.product-modal').remove()">✕</button>
      <div class="pm-img"><img src="${img}" alt="${p.name_ru}"></div>
      <div class="pm-info">
        <div class="pm-brand">${p.brand}</div>
        <h2 class="pm-title">${p.name_ru}</h2>
        <div class="pm-price">${formatPrice(p.price)}</div>
        ${p.sizes && p.sizes.length ? `
          <div class="pm-section-label">Размер</div>
          <div class="pm-options" data-group="size">${sizesHtml}</div>
        ` : ''}
        ${p.colors && p.colors.length ? `
          <div class="pm-section-label">Цвет</div>
          <div class="pm-options" data-group="color">${colorsHtml}</div>
        ` : ''}
        <button class="pm-add" id="pmAdd">Добавить в корзину</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // закрытие по backdrop
  modal.addEventListener('click', e => {
    if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
  });

  // выбор опций
  modal.querySelectorAll('.pm-option').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.parentElement.dataset.group;
      modal.querySelectorAll(`[data-group="${group}"] .pm-option`).forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      if (group === 'size') selectedSize = el.dataset.size;
      if (group === 'color') selectedColor = el.dataset.color;
    });
  });

  // добавление в корзину
  modal.querySelector('#pmAdd').addEventListener('click', () => {
    addToCart(p, selectedSize, selectedColor);
    modal.remove();
    document.body.style.overflow = '';
    openCart();
  });
}

// --- Корзина ---
function addToCart(product, size, color) {
  // один "ключ" в корзине = товар + размер + цвет
  const key = `${product.id}|${size||''}|${color||''}`;
  const existing = CART.find(i => i.key === key);
  if (existing) {
    existing.qty += 1;
  } else {
    CART.push({
      key,
      id: product.id,
      name: product.name_ru,
      brand: product.brand,
      price: product.price,
      image: product.images && product.images[0] ? product.images[0] : null,
      size, color,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
}

function updateQty(key, delta) {
  const item = CART.find(i => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    CART = CART.filter(i => i.key !== key);
    window.__CART__ = CART;
  }
  saveCart();
  renderCart();
}

function removeItem(key) {
  CART = CART.filter(i => i.key !== key);
  window.__CART__ = CART;
  saveCart();
  renderCart();
}

function cartTotal() {
  return CART.reduce((s, i) => s + i.price * i.qty, 0);
}
function cartCount() {
  return CART.reduce((s, i) => s + i.qty, 0);
}

function renderCart() {
  const count = cartCount();
  const countEl = document.getElementById('cartCount');
  if (countEl) countEl.textContent = count;

  const itemsEl = document.getElementById('cartItems');
  if (!itemsEl) return;

  if (!CART.length) {
    itemsEl.innerHTML = '<div class="cart-empty">Корзина пуста<br><br>Добавьте что-нибудь из каталога</div>';
  } else {
    itemsEl.innerHTML = CART.map(i => `
      <div class="cart-item">
        <div class="cart-item-img">
          ${i.image ? `<img src="${productImageUrl(i.image)}" alt="${i.name}">` : ''}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-meta">
            ${i.brand} ${i.size ? '· ' + i.size : ''} ${i.color ? '· ' + i.color : ''}
          </div>
          <div class="qty">
            <button onclick="updateQty('${i.key}', -1)">−</button>
            <span>${i.qty}</span>
            <button onclick="updateQty('${i.key}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-price">${formatPrice(i.price * i.qty)}</div>
          <button class="cart-item-remove" onclick="removeItem('${i.key}')">Удалить</button>
        </div>
      </div>
    `).join('');
  }

  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = formatPrice(cartTotal());

  const checkoutBtn = document.getElementById('cartCheckout');
  if (checkoutBtn) checkoutBtn.disabled = CART.length === 0;
}

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('cartBackdrop')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartBackdrop')?.classList.remove('open');
  document.body.style.overflow = '';
}

function checkoutToTelegram() {
  if (!CART.length) return;
  let msg = 'Здравствуйте! Хочу оформить заказ:\n\n';
  CART.forEach((i, idx) => {
    msg += `${idx + 1}. ${i.name}`;
    if (i.size) msg += ` · ${i.size}`;
    if (i.color) msg += ` · ${i.color}`;
    msg += ` — ${i.qty} шт — ${formatPrice(i.price * i.qty)}\n`;
  });
  msg += `\nИтого: ${formatPrice(cartTotal())}\n\n`;
  msg += `Имя: \nГород: \nАдрес доставки: \nСпособ оплаты: `;

  const url = `${SHOP_CONFIG.telegramUrl}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartBtn')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartBackdrop')?.addEventListener('click', closeCart);
  document.getElementById('cartCheckout')?.addEventListener('click', checkoutToTelegram);
  document.getElementById('burger')?.addEventListener('click', () => {
    document.querySelector('.nav')?.classList.toggle('mobile-open');
  });
  renderCart();
});

// делаем функции доступными глобально для inline onclick
window.openProductModal = openProductModal;
window.updateQty = updateQty;
window.removeItem = removeItem;
