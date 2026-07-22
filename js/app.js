/* ============================================
   BRAND — общая логика
   ============================================ */

// --- Конфиг магазина (легко меняется, также подменяется из settings.json) ---
const SHOP_CONFIG = {
  currency: '₽',
  telegram: 'xpodium_russia',  // ник менеджера (подменится из settings)
  telegramUrl: 'https://t.me/xpodium_russia',
  orderTelegram: 'barkovdenis',  // личный TG для заказов (подменится из settings)
  orderTelegramUrl: 'https://t.me/barkovdenis',
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
// Регистр названия не важен — нормализуем при поиске
const COLOR_SWATCH = {
  // Базовые
  'чёрный': '#0a0a0a', 'черный': '#0a0a0a',
  'белый': '#ffffff',
  'серый': '#8a8a8a', 'тёмно-серый': '#3a3a3a', 'темно-серый': '#3a3a3a',
  'светло-серый': '#cfcfcf',
  // Зелёные
  'зелёный': '#2d5a3d', 'зеленый': '#2d5a3d',
  'тёмно-зелёный': '#1f3a2a', 'темно-зеленый': '#1f3a2a',
  'мятный': '#a8d8c0', 'оливковый': '#6b7a3d',
  'хаки': '#8b7d5a', 'армейский зелёный': '#4a5a3a', 'армейский зеленый': '#4a5a3a',
  'серо-зелёный': '#7a8a6a', 'серо-зеленый': '#7a8a6a',
  // Синие
  'синий': '#2a4a7a', 'тёмно-синий': '#1a2b4a', 'темно-синий': '#1a2b4a',
  'голубой': '#8ab4d8', 'бирюзовый': '#3da6a8', 'индиго': '#3a3a7a',
  // Красные / розовые
  'красный': '#b33030', 'тёмно-красный': '#6b2020', 'темно-красный': '#6b2020',
  'бордовый': '#5a1a2a',
  'розовый': '#ffb6c1', 'розово-красный': '#c8456a', 'малиновый': '#a8265a',
  'пурпурный': '#a83a78', 'фуксия': '#d63a8a',
  // Жёлтые / оранжевые
  'жёлтый': '#e8c547', 'желтый': '#e8c547', 'оранжевый': '#e88530',
  'кремовый': '#e8dcc4', 'бежевый': '#d8c8a8',
  // Коричневые
  'коричневый': '#6b4423', 'коричневый мокко': '#5a3a2a',
  'кофейный': '#3a2a1a', 'шоколадный': '#3d2818',
  // Фиолетовые / лавандовые
  'фиолетовый': '#6a3aa8', 'тёмно-фиолетовый': '#3a1a5a', 'темно-фиолетовый': '#3a1a5a',
  'лавандовый': '#b8a0d8', 'сиреневый': '#a890c8',
  // Металлики
  'золотой': '#c9a86a', 'серебряный': '#b8b8b8', 'бронзовый': '#a87838',
};
function getSwatchColor(colorName) {
  if (!colorName) return '#cccccc';
  // если составной (Белый+Серый) — берём первый
  const first = colorName.split('+')[0].split('(')[0].trim().toLowerCase();
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
  // Безопасный data-product-id (без проблем с кодировкой)
  const safeId = String(p.id || '').replace(/"/g, '&quot;');
  const safeName = String(p.name_ru || '').replace(/"/g, '&quot;');
  return `
    <div class="product-card" data-product-id="${safeId}">
      <div class="product-img"><img src="${img}" alt="${safeName}" loading="lazy"></div>
      <div class="product-brand">${p.brand || ''}</div>
      <div class="product-name">${p.name_ru || ''}</div>
      <div class="product-price">${formatPrice(p.price)}</div>
      ${colors ? `<div class="product-colors">${colors}</div>` : ''}
    </div>
  `;
}

// --- Модалка товара ---
async function openProductModal(productId) {
  // Если товары ещё не загружены — ждём (на медленном интернете может опередить)
  if (!PRODUCTS.length) {
    try {
      await loadProducts();
    } catch (e) {
      console.warn('Не удалось загрузить товары');
      return;
    }
  }
  // Настройки нужны для таблицы размеров. Повторный вызов дешёвый — внутри стоит защита.
  try { await loadShopSettings(); } catch (e) { /* без настроек просто не будет таблицы */ }
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) {
    console.warn('Товар не найден:', productId);
    return;
  }

  // Убираем предыдущие открытые модалки (защита от дублей)
  document.querySelectorAll('.product-modal').forEach(m => m.remove());

  // Обновляем URL: добавляем ?product=ID без перезагрузки страницы
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('product', productId);
    window.history.pushState({ productId }, '', url.toString());
  } catch (e) { /* fallback: оставляем URL как есть */ }

  let selectedSize = (p.sizes && p.sizes[0]) || null;
  let selectedColor = (p.colors && p.colors[0]) || null;
  let currentImageIndex = 0;

  const images = (p.images && p.images.length) ? p.images : [null];
  const mainImg = productImageUrl(images[0]);

  const sizesHtml = (p.sizes || []).map(s =>
    `<div class="pm-option pm-size ${s === selectedSize ? 'selected' : ''}" data-size="${s}">${s}</div>`
  ).join('');
  const colorsHtml = (p.colors || []).map(c =>
    `<div class="pm-option pm-color ${c === selectedColor ? 'selected' : ''}" data-color="${c}" title="${c}">
       <span class="product-color" style="background:${getSwatchColor(c)};display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,0.15)"></span><span class="pm-option-label">${c}</span>
     </div>`
  ).join('');

  // Галерея миниатюр
  const thumbsHtml = images.length > 1
    ? `<div class="pm-thumbs">${images.map((src, i) =>
        `<button class="pm-thumb ${i === 0 ? 'active' : ''}" data-index="${i}">
          <img src="${productImageUrl(src)}" alt="">
        </button>`
      ).join('')}</div>`
    : '';

  // Блок "Вам ещё может понравиться" — показываем товары из противоположной категории
  const recommendationsHtml = buildRecommendations(p);

  const modal = document.createElement('div');
  modal.className = 'product-modal open';
  modal.innerHTML = `
    <div class="product-modal-inner">
      <button class="pm-close" aria-label="Закрыть">✕</button>
      <div class="pm-gallery">
        <div class="pm-img">
          <img src="${mainImg}" alt="${p.name_ru}" id="pmMainImg">
          ${images.length > 1 ? `
            <button class="pm-nav pm-prev" aria-label="Назад">‹</button>
            <button class="pm-nav pm-next" aria-label="Вперёд">›</button>
          ` : ''}
        </div>
        ${thumbsHtml}
      </div>
      <div class="pm-info">
        <div class="pm-brand">${p.brand}</div>
        <h2 class="pm-title">${p.name_ru}</h2>
        <div class="pm-price">${formatPrice(p.price)}</div>
        ${p.sizes && p.sizes.length ? `
          <div class="pm-section-label">Размер</div>
          <div class="pm-options" data-group="size">${sizesHtml}</div>
          ${sizeChartHtml(getSizeChart(p))}
        ` : ''}
        ${p.colors && p.colors.length ? `
          <div class="pm-section-label">Цвет</div>
          <div class="pm-options" data-group="color">${colorsHtml}</div>
        ` : ''}
        <button class="pm-add" id="pmAdd">Добавить в корзину</button>
        ${recommendationsHtml ? recommendationsHtml.inlineHtml : ''}
      </div>
      ${recommendationsHtml ? `
        <aside class="pm-recommendations-side">
          <div class="pm-rec-title">Вам ещё может понравиться</div>
          <div class="pm-rec-grid">${recommendationsHtml.cardsHtml}</div>
        </aside>
      ` : ''}
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Предзагружаем все остальные фото товара в фоне (чтобы листание было мгновенным)
  if (images.length > 1) {
    images.slice(1).forEach(src => {
      const img = new Image();
      img.src = productImageUrl(src);
    });
  }

  // Единая функция закрытия (гарантирует восстановление scroll)
  function closeModal() {
    modal.remove();
    // Убираем product из URL
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('product')) {
        url.searchParams.delete('product');
        window.history.pushState({}, '', url.toString());
      }
    } catch (e) { /* пропускаем */ }
    // Снимаем overflow только если нет других открытых модалок
    if (!document.querySelector('.product-modal.open, .cart-overlay.open')) {
      document.body.style.overflow = '';
    }
    document.removeEventListener('keydown', onEsc);
  }

  // Закрытие по клавише Esc
  function onEsc(e) {
    if (e.key === 'Escape') closeModal();
  }
  document.addEventListener('keydown', onEsc);

  // Кнопка закрытия
  modal.querySelector('.pm-close').addEventListener('click', closeModal);

  // Закрытие по backdrop
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Переключение фото
  function showImage(index) {
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    currentImageIndex = index;
    const mainImgEl = modal.querySelector('#pmMainImg');
    if (mainImgEl) mainImgEl.src = productImageUrl(images[index]);
    modal.querySelectorAll('.pm-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  // Делегирование клика для thumbnails и стрелок (надёжнее на Android)
  modal.addEventListener('click', e => {
    // Клик по миниатюре
    const thumb = e.target.closest('.pm-thumb');
    if (thumb && modal.contains(thumb)) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(thumb.dataset.index, 10);
      if (!isNaN(idx)) showImage(idx);
      return;
    }
    // Клик по стрелке "назад"
    if (e.target.closest('.pm-prev')) {
      e.preventDefault();
      e.stopPropagation();
      showImage(currentImageIndex - 1);
      return;
    }
    // Клик по стрелке "вперёд"
    if (e.target.closest('.pm-next')) {
      e.preventDefault();
      e.stopPropagation();
      showImage(currentImageIndex + 1);
      return;
    }
    // Клик по карточке рекомендации — открыть этот товар (закрыть текущую и открыть новую)
    const recCard = e.target.closest('.pm-rec-card[data-rec-id]');
    if (recCard) {
      e.preventDefault();
      e.stopPropagation();
      const recId = recCard.dataset.recId;
      if (recId) {
        closeModal();
        // Небольшая задержка чтобы модалка успела закрыться
        setTimeout(() => openProductModal(recId), 50);
      }
      return;
    }
  });

  // Клавиши стрелок для навигации
  document.addEventListener('keydown', function onArrow(e) {
    if (!document.body.contains(modal)) {
      document.removeEventListener('keydown', onArrow);
      return;
    }
    if (e.key === 'ArrowLeft') showImage(currentImageIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentImageIndex + 1);
  });

  // выбор опций
  modal.querySelectorAll('.pm-option').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.parentElement.dataset.group;
      modal.querySelectorAll(`[data-group="${group}"] .pm-option`).forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      if (group === 'size') selectedSize = el.dataset.size;
      if (group === 'color') {
        selectedColor = el.dataset.color;
        // Если название обрезано — показываем всплывашку с полным
        const labelEl = el.querySelector('.pm-option-label');
        if (labelEl && labelEl.scrollWidth > labelEl.clientWidth + 2) {
          showColorTooltip(el, el.dataset.color);
        }
      }
    });

    // На десктопе показываем всплывашку при наведении (если цвет обрезан)
    // Удаляем нативный title чтобы не дублировать с кастомным
    if (el.classList.contains('pm-color')) {
      el.removeAttribute('title');
      el.addEventListener('mouseenter', () => {
        const labelEl = el.querySelector('.pm-option-label');
        if (labelEl && labelEl.scrollWidth > labelEl.clientWidth + 2) {
          showColorTooltip(el, el.dataset.color, true);
        }
      });
      el.addEventListener('mouseleave', () => {
        document.querySelectorAll('.color-tooltip.hover-tooltip').forEach(t => {
          t.style.opacity = '0';
          t.style.transform = 'translateY(4px)';
          setTimeout(() => t.remove(), 200);
        });
      });
    }
  });

  // добавление в корзину
  modal.querySelector('#pmAdd').addEventListener('click', () => {
    addToCart(p, selectedSize, selectedColor);
    closeModal();
    openCart();
  });
}

// --- Корзина ---
// Показать всплывашку с полным названием цвета
// Все стили inline — работает независимо от style.css
// isHover=true — тултип для hover на десктопе (убирается через mouseleave)
// isHover=false — тултип для тапа на мобиле (исчезает через 1.5с)
function showColorTooltip(targetEl, fullName, isHover) {
  // Удаляем предыдущие всплывашки этого типа
  const selector = isHover ? '.color-tooltip.hover-tooltip' : '.color-tooltip:not(.hover-tooltip)';
  document.querySelectorAll(selector).forEach(t => t.remove());

  const tooltip = document.createElement('div');
  tooltip.className = 'color-tooltip' + (isHover ? ' hover-tooltip' : '');
  tooltip.textContent = fullName;

  // Все стили — inline, чтобы работало без зависимости от style.css
  Object.assign(tooltip.style, {
    position: 'fixed',
    zIndex: '10000',
    background: '#0a0a0a',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '500',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
    opacity: '0',
    transform: 'translateY(4px)',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
    letterSpacing: '0.01em',
  });

  document.body.appendChild(tooltip);

  // Позиционируем над кнопкой
  const rect = targetEl.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left + (rect.width - tooltipRect.width) / 2;
  const margin = 8;
  if (left < margin) left = margin;
  if (left + tooltipRect.width > window.innerWidth - margin) {
    left = window.innerWidth - tooltipRect.width - margin;
  }
  const topAbove = rect.top - tooltipRect.height - 8;
  const finalTop = topAbove < 8 ? rect.bottom + 8 : topAbove;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${finalTop}px`;

  // Появление с анимацией (через rAF, чтобы браузер успел отрисовать начальное состояние)
  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
  });

  // Только для тапа (не hover) — убираем через 1.5 секунды
  if (!isHover) {
    setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(4px)';
      setTimeout(() => tooltip.remove(), 200);
    }, 1500);
  }
}

// === Классификация товаров для рекомендаций ===
// Определяем пол по slug'у/ID товара
function detectGender(p) {
  const id = (p.id || '').toLowerCase();
  const name = (p.name_ru || '').toLowerCase();
  // Женское
  if (/(^|[-_])(women|womens|wmn|girls|ladies|wm)([-_]|$)/.test(id) ||
      /(^|[-_])(zhensk|zhenskiy|zhenskaya|zhensky)/.test(id) ||
      /женск|девуш|девич/.test(name)) {
    return 'female';
  }
  // Мужское
  if (/(^|[-_])(men|mens|boys|mn)([-_]|$)/.test(id) ||
      /(^|[-_])(muzh|muzhskoy|muzhskaya|muzhsky)/.test(id) ||
      /мужск|муж\.|мужич/.test(name)) {
    return 'male';
  }
  return 'unisex';
}

// Определяем «тип» товара для слотов
function detectType(p) {
  const id = (p.id || '').toLowerCase();
  const name = (p.name_ru || '').toLowerCase();

  // Накладки
  if (/grips|nakladki/.test(id) || /накладк/.test(name)) return 'grips';
  // Пояс
  if (/belt|poyas/.test(id) || /пояс/.test(name)) return 'belt';
  // Налокотники — ДО knees, иначе sleeves их съедает
  if (/elbow|nalokot/.test(id) || /налокот/.test(name)) return 'elbow';
  // Наколенники
  if (/knee|sleeves|nakolenniki/.test(id) || /наколенн/.test(name)) return 'knees';
  // Скакалка
  if (/rope|skakalka|jump/.test(id) || /скакал/.test(name)) return 'rope';
  // Тейп / хук-грип
  if (/tape|hook|teyp/.test(id) || /тейп|хук/.test(name)) return 'tape';
  // Лямки для тяги (унисекс — экипировка)
  if (/lifting-?strap|lyamk/.test(id) || /лямк/.test(name)) return 'straps';
  // Кистевые ремни / напульсники (включая wristband)
  if (/wraps|wristband|kist|napuls/.test(id) || /кистев|обмотк|напульс/.test(name)) return 'wraps';
  // Рюкзак / сумка
  if (/backpack|bag|rukzak|sumka/.test(id) || /рюкзак|сумк/.test(name)) return 'bag';
  // Носки
  if (/sock|noski/.test(id) || /носк/.test(name)) return 'socks';
  // Брелок
  if (/keychain|brelok/.test(id) || /брелок|брелк/.test(name)) return 'keychain';
  // Повязка на голову — ДО top, иначе sweat-band ложно ловится как top через sweat
  if (/head-?band|sweat-?band|povyazk/.test(id) || /повязк/.test(name)) return 'headband';
  // Костюм (верх + низ комплектом) — ДО top/bottom
  if (/kostyum|suit/.test(id) || /костюм/.test(name)) return 'suit';
  // Низ (шорты/штаны/лосины)
  if (/shorts|pants|leggings|losin|shtany|trous/.test(id) ||
      /шорт|штан|лосин|брюк|треник/.test(name)) {
    return 'bottom';
  }
  // Верх (футболка/майка/худи)
  if (/t-?shirt|tshirt|futbolka|mayka|vest|top|hood|sweat/.test(id) ||
      /футбол|майк|худи|свитш|топ|джемпер|кофт/.test(name)) {
    return 'top';
  }
  return 'other';
}

// Перемешивает массив (Fisher-Yates) — каждый раз даёт разный порядок
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Случайный 50/50
function coin() {
  return Math.random() < 0.5;
}

// Случайный элемент массива
function randomItem(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Хелпер: формирует HTML блока рекомендаций (используется и обычной и equipment-веткой)
function renderRecommendationsHtml(items) {
  if (!items || !items.length) return null;
  const cardsHtml = items.map(p => {
    const img = (p.images && p.images[0]) ? productImageUrl(p.images[0]) : '';
    return `
      <a class="pm-rec-card" href="?product=${encodeURIComponent(p.id)}" data-rec-id="${p.id}">
        <div class="pm-rec-img">${img ? `<img src="${img}" alt="${p.name_ru}" loading="lazy">` : ''}</div>
        <div class="pm-rec-info">
          <div class="pm-rec-brand">${p.brand}</div>
          <div class="pm-rec-name">${p.name_ru}</div>
          <div class="pm-rec-price">${formatPrice(p.price)}</div>
        </div>
      </a>
    `;
  }).join('');
  return {
    cardsHtml,
    inlineHtml: `
      <div class="pm-recommendations">
        <div class="pm-rec-title">Вам ещё может понравиться</div>
        <div class="pm-rec-grid">${cardsHtml}</div>
      </div>
    `,
  };
}

// Строит блок "Вам ещё может понравиться"
// — для основного каталога: 6 фиксированных слотов с разными типами товаров
// — для оборудования (equipment): до 6 рандомных товаров из этой же категории
function buildRecommendations(currentProduct) {
  if (!currentProduct) return null;

  // Для оборудования — рандомные товары из той же категории equipment
  // (например к штанге предлагать диски, замки, грифы и т.п.)
  if (currentProduct.category === 'equipment') {
    const candidates = PRODUCTS.filter(p =>
      p.id !== currentProduct.id && p.category === 'equipment'
    );
    const picked = shuffleArray(candidates).slice(0, 6);
    return renderRecommendationsHtml(picked);
  }

  const currentId = currentProduct.id;
  const currentGender = detectGender(currentProduct);

  // Все товары в каталоге, классифицированные
  const all = PRODUCTS.filter(p => p.id !== currentId).map(p => ({
    p,
    gender: detectGender(p),
    type: detectType(p),
  }));

  // Хелпер: фильтр по полу (если открыт мужской — только мужские+унисекс, и наоборот)
  const matchGender = (item) => {
    if (currentGender === 'unisex') return true;
    return item.gender === currentGender || item.gender === 'unisex';
  };

  const slots = [];

  // === Слот 1: рюкзак ИЛИ носки (50/50) ===
  const wantBag = coin();
  let s1 = null;
  const bags = all.filter(x => x.type === 'bag');
  const socks = all.filter(x => x.type === 'socks');
  if (wantBag && bags.length) s1 = randomItem(bags).p;
  else if (!wantBag && socks.length) s1 = randomItem(socks).p;
  else if (bags.length) s1 = randomItem(bags).p;
  else if (socks.length) s1 = randomItem(socks).p;
  if (s1) slots.push(s1);

  // === Слот 2: накладки (приоритет elite-sticky-grips) ===
  const allGrips = all.filter(x => x.type === 'grips');
  const elite = allGrips.find(x => /elite/i.test(x.p.id));
  const otherGrips = allGrips.filter(x => x !== elite);
  let s2 = null;
  if (/elite/i.test(currentId)) {
    // Открыты Elite — показываем НЕ Elite (любые другие накладки)
    s2 = randomItem(otherGrips)?.p || null;
  } else {
    // Не Elite открыты — 50/50 показываем Elite или другие
    if (elite && coin()) {
      s2 = elite.p;
    } else {
      s2 = randomItem(allGrips)?.p || null;
    }
  }
  if (s2) slots.push(s2);

  // === Слот 3: верх (top или suit) с учётом пола ===
  // Костюм может попасть в верх ИЛИ низ — это нормально, он закрывает оба слота визуально
  const tops = all.filter(x => x.type === 'top' && matchGender(x));
  const suits = all.filter(x => x.type === 'suit' && matchGender(x));
  const topPool = [...tops, ...suits];
  const s3 = randomItem(topPool)?.p || null;
  if (s3) slots.push(s3);

  // === Слот 4: низ (bottom или suit) с учётом пола, не дублируя костюм из s3 ===
  const bottoms = all.filter(x => x.type === 'bottom' && matchGender(x));
  const bottomPool = [...bottoms, ...suits.filter(x => x.p.id !== (s3 && s3.id))];
  const s4 = randomItem(bottomPool)?.p || null;
  if (s4) slots.push(s4);

  // === Слот 5: наколенники ===
  const knees = all.filter(x => x.type === 'knees');
  const s5 = randomItem(knees)?.p || null;
  if (s5) slots.push(s5);

  // === Слот 6: скакалка / тейп / лямки / повязка (рандом среди доступных) ===
  // Раньше было только rope+tape (50/50). Теперь добавлены straps и headband — экипировка унисекс.
  const ropes = all.filter(x => x.type === 'rope');
  const tapes = all.filter(x => x.type === 'tape');
  const straps = all.filter(x => x.type === 'straps');
  const headbands = all.filter(x => x.type === 'headband');
  const slot6Pool = [...ropes, ...tapes, ...straps, ...headbands];
  const s6 = randomItem(slot6Pool)?.p || null;
  if (s6) slots.push(s6);

  // Убираем дубли по ID (на случай если один и тот же товар попал в 2 слота)
  const seen = new Set();
  const finalSlots = slots.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Диагностический лог: какие товары не попали в слоты + какие не распознались по типу
  // Полезно проверять что все slug'и парсятся правильно
  if (typeof window !== 'undefined' && console && console.groupCollapsed) {
    const usedIds = new Set(finalSlots.map(p => p.id));
    // Не шумим в логе аксессуарами и оборудованием — они и не должны попадать в рекомендации
    const unrecognized = all.filter(x =>
      x.type === 'other' &&
      x.p.category !== 'accessories' &&
      x.p.category !== 'equipment'
    );
    const recognizedButUnused = all.filter(x =>
      !usedIds.has(x.p.id) && x.type !== 'other'
    );

    console.groupCollapsed(`[Рекомендации] Открыт: ${currentProduct.id} (тип: ${detectType(currentProduct)}, пол: ${currentGender})`);

    if (unrecognized.length) {
      console.warn('⚠ НЕ РАСПОЗНАНЫ (тип: other) — нужно проверить slug:');
      unrecognized.forEach(x => console.warn(`  • ${x.p.id} | ${x.p.name_ru}`));
    }

    if (recognizedButUnused.length) {
      console.log('Не попали в слоты этого открытия (это нормально, набор рандомный):');
      recognizedButUnused.forEach(x =>
        console.log(`  • ${x.p.id} (тип: ${x.type}, пол: ${x.gender})`)
      );
    }

    console.groupEnd();
  }

  if (!finalSlots.length) return null;

  return renderRecommendationsHtml(finalSlots);
}

// =====================================================
// СКИДКИ ОТ СУММЫ ЗАКАЗА + ПРОМОКОДЫ
// =====================================================
// Логика «А»: применяется БОЛЬШАЯ из двух (auto-discount от суммы или промокод).
// Не складываются — клиенту считается одна, наибольшая.

// Состояние:
let APPLIED_PROMO = null;       // { code, discount_pct } если применён
let DISCOUNT_TIERS = [];        // [{ minAmount: 10000, percent: 5 }, ...] — отсортировано по возрастанию
let PROMO_CODES = [];           // [{ code, discount_pct, active }] — только активные
let GIFT_CONFIG = null;         // { minAmount, productId, note } или null если выключено
let SIZE_CHARTS = [];           // [{ subcategory, col_1_label, col_2_label, rows: [...], note }]
let SHOP_SETTINGS_LOADED = false;

// Парсеры. Поддерживают и числа и форматированные строки из админки ("10 000 ₽", "5%")
function parseRubleAmount(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  // Убираем всё кроме цифр (пробелы между разрядами, символ ₽, точки и т.п.)
  const digits = String(v).replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
}
function parsePercent(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const m = String(v).match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : 0;
}

// Загружает settings.json (генерируется build-content.js из content/settings/*.json)
// и заполняет DISCOUNT_TIERS + PROMO_CODES за один запрос.
async function loadShopSettings() {
  if (SHOP_SETTINGS_LOADED) return;
  SHOP_SETTINGS_LOADED = true;
  try {
    const res = await fetch('settings.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();

    // Скидки от суммы (settings.home.discounts)
    const d = data.home && data.home.discounts;
    if (d && d.enabled !== false && Array.isArray(d.tiers)) {
      DISCOUNT_TIERS = d.tiers
        .map(t => ({
          minAmount: parseRubleAmount(t.amount),
          percent: parsePercent(t.discount),
        }))
        .filter(t => t.minAmount > 0 && t.percent > 0)
        .sort((a, b) => a.minAmount - b.minAmount);
    }

    // Промокоды (settings.promos.items)
    const p = data.promos;
    if (p && Array.isArray(p.items)) {
      PROMO_CODES = p.items
        .filter(x => x && x.active !== false && x.code)
        .map(x => ({
          code: String(x.code).trim().toUpperCase(),
          discount_pct: parsePercent(x.discount_pct),
        }))
        .filter(x => x.code && x.discount_pct > 0);
    }

    // Подарок при заказе (settings.gift)
    const g = data.gift;
    if (g && g.enabled && g.product_id) {
      GIFT_CONFIG = {
        minAmount: parseRubleAmount(g.min_amount) || 5000,
        productId: String(g.product_id).trim(),
        note: g.note || '',
      };
    } else {
      GIFT_CONFIG = null;
    }

    // Таблицы размеров (settings.size_charts) — по подкатегориям
    const sc = data.size_charts;
    if (sc && Array.isArray(sc.charts)) {
      SIZE_CHARTS = sc.charts.filter(c =>
        c && c.subcategory && Array.isArray(c.rows) && c.rows.length
      );
    } else {
      SIZE_CHARTS = [];
    }
  } catch (e) {
    console.warn('[Shop settings] загрузка не удалась', e);
  }
}

// Совместимость со старыми вызовами в инициализации
async function loadDiscountTiers() {
  await loadShopSettings();
  return DISCOUNT_TIERS;
}
async function loadPromoCodes() {
  await loadShopSettings();
  return PROMO_CODES;
}

// --- Таблица размеров ---

// Экранирование текста из настроек перед вставкой в HTML
function escapeHtmlText(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Возвращает таблицу размеров для товара (ищем по его подкатегории)
function getSizeChart(product) {
  if (!product || !SIZE_CHARTS.length) return null;
  return SIZE_CHARTS.find(c => c.subcategory === product.subcategory) || null;
}

// HTML-блок «Таблица размеров»: ссылка-переключатель + скрытая таблица
function sizeChartHtml(chart) {
  if (!chart) return '';
  const rows = chart.rows.filter(r => r && r.size);
  if (!rows.length) return '';

  // Вторая колонка показывается только если она заполнена
  const hasCol2 = !!(chart.col_2_label && rows.some(r => r.value_2));
  const th = 'padding:9px 12px;text-align:left;font-weight:600;font-size:13px;border-bottom:1px solid #e2e2e2;white-space:nowrap;';
  const td = 'padding:9px 12px;text-align:left;font-size:14px;border-bottom:1px solid #f0f0f0;white-space:nowrap;';

  const headHtml = `
    <tr>
      <th style="${th}">Размер</th>
      <th style="${th}">${escapeHtmlText(chart.col_1_label || 'Замер')}</th>
      ${hasCol2 ? `<th style="${th}">${escapeHtmlText(chart.col_2_label)}</th>` : ''}
    </tr>
  `;

  const bodyHtml = rows.map(r => `
    <tr>
      <td style="${td}font-weight:600;">${escapeHtmlText(r.size)}</td>
      <td style="${td}">${escapeHtmlText(r.value_1)}</td>
      ${hasCol2 ? `<td style="${td}">${escapeHtmlText(r.value_2 || '—')}</td>` : ''}
    </tr>
  `).join('');

  const noteHtml = chart.note
    ? `<div style="margin-top:10px;font-size:13px;line-height:1.5;color:#666;">${escapeHtmlText(chart.note)}</div>`
    : '';

  return `
    <button type="button" id="pmSizeChartToggle" onclick="toggleSizeChart()"
            style="display:inline-flex;align-items:center;gap:6px;margin:2px 0 6px;padding:0;background:none;border:none;
                   font-family:inherit;font-size:13px;color:#0a0a0a;text-decoration:underline;text-underline-offset:3px;cursor:pointer;">
      Таблица размеров
    </button>
    <div id="pmSizeChart" style="display:none;margin:4px 0 16px;padding:14px;background:#f7f7f7;border-radius:8px;">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-family:inherit;">
          <thead>${headHtml}</thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
      ${noteHtml}
    </div>
  `;
}

// Показать/скрыть таблицу размеров в карточке товара
function toggleSizeChart() {
  const box = document.getElementById('pmSizeChart');
  if (!box) return;
  box.style.display = (box.style.display === 'none') ? 'block' : 'none';
}
window.toggleSizeChart = toggleSizeChart;

// Возвращает % автоматической скидки для данной суммы (берёт максимально подходящий уровень)
function findAutoDiscountPercent(subtotal) {
  if (!DISCOUNT_TIERS.length) return 0;
  let best = 0;
  for (const t of DISCOUNT_TIERS) {
    if (subtotal >= t.minAmount && t.percent > best) best = t.percent;
  }
  return best;
}

// Полный расчёт корзины со скидками
function cartCalculations() {
  const subtotal = CART.reduce((s, i) => s + i.price * i.qty, 0);
  const autoPercent = findAutoDiscountPercent(subtotal);
  const promoPercent = APPLIED_PROMO ? parsePercent(APPLIED_PROMO.discount_pct) : 0;

  // Вариант А — побеждает бóльшая скидка
  let appliedSource = null;
  let appliedPercent = 0;
  if (autoPercent >= promoPercent && autoPercent > 0) {
    appliedSource = 'auto';
    appliedPercent = autoPercent;
  } else if (promoPercent > 0) {
    appliedSource = 'promo';
    appliedPercent = promoPercent;
  }

  const discountAmount = Math.round(subtotal * appliedPercent / 100);
  const total = subtotal - discountAmount;

  // Найдём минимальную сумму следующего уровня (для подсказки «доберите до...»)
  const nextTier = DISCOUNT_TIERS.find(t => subtotal < t.minAmount);

  return {
    subtotal,
    appliedSource,    // 'auto' | 'promo' | null
    appliedPercent,
    discountAmount,
    total,
    autoPercent,      // для информации
    promoPercent,
    nextTier,         // следующий уровень который ещё не достигнут
  };
}

// Возвращает товар-подарок если акция активна и сумма достаточна.
// Сам товар НЕ хранится в CART — добавляется виртуально при рендере и в TG-сообщении.
function getActiveGiftItem() {
  if (!GIFT_CONFIG || !PRODUCTS.length || !CART.length) return null;
  const subtotal = CART.reduce((s, i) => s + i.price * i.qty, 0);
  if (subtotal < GIFT_CONFIG.minAmount) return null;

  const product = PRODUCTS.find(p =>
    p.id === GIFT_CONFIG.productId ||
    p.slug === GIFT_CONFIG.productId
  );
  if (!product) return null;

  return {
    id: product.id,
    name: product.name_ru || product.name || 'Подарок',
    brand: product.brand || '',
    image: product.images && product.images[0] ? product.images[0] : null,
    note: GIFT_CONFIG.note,
  };
}

// Применить промокод по коду. Возвращает { ok: true } или { ok: false, error }.
function applyPromoCode(rawCode) {
  const trimmed = String(rawCode || '').trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, error: 'Введите промокод' };
  }
  const found = PROMO_CODES.find(p =>
    String(p.code || '').trim().toUpperCase() === trimmed
  );
  if (!found) {
    return { ok: false, error: 'Такого промокода нет' };
  }
  APPLIED_PROMO = {
    code: String(found.code).trim().toUpperCase(),
    discount_pct: parsePercent(found.discount_pct),
  };
  return { ok: true };
}

function clearPromoCode() {
  APPLIED_PROMO = null;
}

// Хендлеры для UI (вызываются из onclick в renderCart)
function applyPromoFromInput() {
  const input = document.getElementById('promoInput');
  const msgEl = document.getElementById('promoMessage');
  if (!input) return;
  const result = applyPromoCode(input.value);
  if (!result.ok) {
    if (msgEl) {
      msgEl.textContent = result.error;
      msgEl.style.color = '#c83030';
    }
    return;
  }
  // Успех — рендерим заново, поле сменится на «Применён: ...»
  renderCart();
}

function clearPromoAndRender() {
  clearPromoCode();
  renderCart();
}

// Делаем доступными для inline onclick
if (typeof window !== 'undefined') {
  window.applyPromoFromInput = applyPromoFromInput;
  window.clearPromoAndRender = clearPromoAndRender;
}

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

  // Готовим контейнер для промо+скидки в футере (вне прокрутки, всегда виден)
  // Создаём один раз и переиспользуем при последующих рендерах
  const footerEl = document.querySelector('.cart-footer');
  const totalRow = footerEl ? footerEl.querySelector('.cart-total') : null;
  let extrasEl = footerEl ? footerEl.querySelector('#cartExtras') : null;
  if (footerEl && totalRow && !extrasEl) {
    extrasEl = document.createElement('div');
    extrasEl.id = 'cartExtras';
    footerEl.insertBefore(extrasEl, totalRow);
  }

  // Пустая корзина
  if (!CART.length) {
    itemsEl.innerHTML = '<div class="cart-empty">Корзина пуста<br><br>Добавьте что-нибудь из каталога</div>';
    if (extrasEl) extrasEl.innerHTML = '';
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = formatPrice(0);
    const checkoutBtn = document.getElementById('cartCheckout');
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  // Список товаров — только в прокручиваемую область
  const itemsHtml = CART.map(i => `
    <div class="cart-item">
      <div class="cart-item-img cart-item-clickable" data-product-id="${i.id}">
        ${i.image ? `<img src="${productImageUrl(i.image)}" alt="${i.name}">` : ''}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name cart-item-clickable" data-product-id="${i.id}">${i.name}</div>
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

  itemsEl.innerHTML = itemsHtml;

  // Виртуальный товар-подарок (если активна акция и сумма достаточна)
  const gift = getActiveGiftItem();
  if (gift) {
    const giftImg = gift.image ? productImageUrl(gift.image) : '';
    const giftEl = document.createElement('div');
    giftEl.className = 'cart-item cart-item-gift';
    giftEl.style.cssText = 'background:#fff8e1;border-radius:6px;padding:10px;margin-top:6px;';
    giftEl.innerHTML = `
      <div class="cart-item-img">
        ${giftImg ? `<img src="${giftImg}" alt="${gift.name}">` : ''}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">🎁 ${gift.name}</div>
        <div class="cart-item-meta" style="color:#a77b00;">${gift.note ? '*' + gift.note : 'В подарок к заказу'}</div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-price" style="color:#0a8a3e;font-weight:600;">Подарок</div>
      </div>
    `;
    itemsEl.appendChild(giftEl);
  }

  // Расчёт скидок
  const calc = cartCalculations();

  // Блок промокода (либо форма ввода, либо «применён»)
  let promoBlock;
  if (APPLIED_PROMO) {
    const wins = calc.appliedSource === 'promo';
    promoBlock = `
      <div class="cart-promo-applied" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;margin-bottom:12px;background:#0a0a0a;color:#fff;border-radius:6px;font-size:14px;">
        <span>Промокод <strong>${APPLIED_PROMO.code}</strong> −${APPLIED_PROMO.discount_pct}%${wins ? '' : ' (не применён — авто-скидка выгоднее)'}</span>
        <button onclick="clearPromoAndRender()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3);padding:5px 12px;border-radius:4px;cursor:pointer;font-size:13px;">Убрать</button>
      </div>
    `;
  } else {
    promoBlock = `
      <div class="cart-promo-form" style="display:flex;gap:8px;margin-bottom:6px;">
        <input type="text" id="promoInput" placeholder="Промокод" autocomplete="off"
               style="flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;font-family:inherit;outline:none;text-transform:uppercase;background:#fff;color:#0a0a0a;"
               onkeydown="if(event.key==='Enter'){event.preventDefault();applyPromoFromInput();}">
        <button onclick="applyPromoFromInput()"
                style="padding:10px 18px;background:#0a0a0a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:inherit;">Применить</button>
      </div>
      <div id="promoMessage" style="font-size:13px;margin-bottom:8px;min-height:18px;"></div>
    `;
  }

  // Блок «Подытог + Скидка» (только если есть скидка)
  let summaryHtml = '';
  if (calc.appliedPercent > 0) {
    const label = calc.appliedSource === 'promo'
      ? `Промокод ${APPLIED_PROMO.code} (−${calc.appliedPercent}%)`
      : `Скидка от суммы заказа (−${calc.appliedPercent}%)`;
    summaryHtml = `
      <div class="cart-summary" style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #eee;font-size:14px;">
        <div style="display:flex;justify-content:space-between;color:#666;margin-bottom:6px;">
          <span>Сумма заказа:</span>
          <span>${formatPrice(calc.subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#0a8a3e;font-weight:500;">
          <span>${label}:</span>
          <span>−${formatPrice(calc.discountAmount)}</span>
        </div>
      </div>
    `;
  } else if (calc.nextTier) {
    // Подсказка «доберите до следующего уровня»
    const need = calc.nextTier.minAmount - calc.subtotal;
    summaryHtml = `
      <div class="cart-next-tier" style="margin-bottom:12px;padding:10px 12px;background:#f7f7f7;border-radius:6px;font-size:13px;color:#555;text-align:center;">
        Доберите ${formatPrice(need)} — получите скидку ${calc.nextTier.percent}%
      </div>
    `;
  }

  // Промо-форма + summary — в футер (всегда видны, не уплывают за прокруткой)
  if (extrasEl) {
    extrasEl.innerHTML = promoBlock + summaryHtml;
  }

  // Итоговая сумма с учётом скидки
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = formatPrice(calc.total);

  const checkoutBtn = document.getElementById('cartCheckout');
  if (checkoutBtn) checkoutBtn.disabled = false;
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
  const calc = cartCalculations();
  const gift = getActiveGiftItem();

  let msg = 'Здравствуйте! Хочу оформить заказ:\n\n';
  CART.forEach((i, idx) => {
    msg += `${idx + 1}. ${i.name}`;
    if (i.size) msg += ` · ${i.size}`;
    if (i.color) msg += ` · ${i.color}`;
    msg += ` — ${i.qty} шт — ${formatPrice(i.price * i.qty)}\n`;
  });

  if (gift) {
    msg += `\n🎁 Подарок: ${gift.name}`;
    if (gift.note) msg += ` (${gift.note})`;
    msg += '\n';
  }

  if (calc.appliedPercent > 0) {
    msg += `\nСумма заказа: ${formatPrice(calc.subtotal)}\n`;
    if (calc.appliedSource === 'promo') {
      msg += `Промокод ${APPLIED_PROMO.code}: −${calc.appliedPercent}% (−${formatPrice(calc.discountAmount)})\n`;
    } else {
      msg += `Скидка от суммы заказа: −${calc.appliedPercent}% (−${formatPrice(calc.discountAmount)})\n`;
    }
    msg += `Итого: ${formatPrice(calc.total)}\n\n`;
  } else {
    msg += `\nИтого: ${formatPrice(calc.total)}\n\n`;
  }

  msg += `Имя: \nГород: \nАдрес доставки: \nСпособ оплаты: `;

  // Используем orderTelegramUrl (личный TG для заказов), а если его нет — обычный telegramUrl
  const targetUrl = SHOP_CONFIG.orderTelegramUrl || SHOP_CONFIG.telegramUrl;
  // Открываем Telegram с предзаполненным текстом.
  // На десктопе/iOS параметр ?text= обычно подхватывается. На Android — нет (поэтому ниже копируем в буфер).
  
  if (typeof ym !== 'undefined') ym(109646659, 'reachGoal', 'telegram_order'); window.open(`${targetUrl}?text=${encodeURIComponent(msg)}`, '_blank');

  // На Android — копируем в буфер + показываем подсказку (на случай если ?text= не подхватился)
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  if (isAndroid) {
    copyToClipboard(msg).then(ok => {
      if (ok) {
        showCheckoutToast('Если поле сообщения пустое — задержите палец и нажмите «Вставить»');
      }
    });
  }
}

// Копирование текста в буфер обмена. Возвращает Promise<boolean> успешно ли.
function copyToClipboard(text) {
  // Современный путь — Clipboard API (нужен HTTPS, что у нас есть)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

// Запасной способ через скрытый textarea + execCommand (старые браузеры)
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// Тост-уведомление снизу экрана (исчезает через 6 секунд)
function showCheckoutToast(message) {
  // Убираем предыдущий тост если есть
  document.querySelectorAll('.checkout-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'checkout-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%) translateY(20px)',
    background: '#0a0a0a',
    color: '#ffffff',
    padding: '14px 22px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'inherit',
    maxWidth: '92vw',
    lineHeight: '1.4',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    zIndex: '10001',
    opacity: '0',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    pointerEvents: 'none',
  });
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 6000);
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

  // Предзагрузка фото товара при наведении на карточку (быстрое открытие модалки)
  const prefetched = new Set();
  document.body.addEventListener('mouseenter', (e) => {
    const card = e.target.closest && e.target.closest('.product-card[data-product-id]');
    if (!card) return;
    const id = card.dataset.productId;
    if (!id || prefetched.has(id)) return;
    prefetched.add(id);
    const product = PRODUCTS.find(p => p.id === id);
    if (!product || !product.images) return;
    // Грузим первые 2 фото в фоне
    product.images.slice(0, 2).forEach(src => {
      const img = new Image();
      img.src = productImageUrl(src);
    });
  }, true);

  // Делегирование клика по карточкам товара (работает для динамически добавленных)
  document.body.addEventListener('click', (e) => {
    // Клик по карточке в каталоге / на главной
    const card = e.target.closest('.product-card[data-product-id]');
    if (card) {
      const id = card.dataset.productId;
      if (id) openProductModal(id);
      return;
    }
    // Клик по строке товара в корзине (фото или название)
    const cartLink = e.target.closest('.cart-item-clickable[data-product-id]');
    if (cartLink) {
      const id = cartLink.dataset.productId;
      if (id) {
        closeCart();
        openProductModal(id);
      }
    }
  });

  // Если в URL есть ?product=ID — открываем модалку автоматически
  // Ждём пока товары загрузятся
  (async function() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (!productId) return;
    // Ждём загрузки PRODUCTS
    let attempts = 0;
    while (PRODUCTS.length === 0 && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (PRODUCTS.length > 0) {
      openProductModal(productId);
    }
  })();

  // Загружаем настройки скидок и промокоды в фоне
  // (после загрузки — перерендер корзины чтобы подсказка про скидки появилась сразу)
  Promise.all([loadDiscountTiers(), loadPromoCodes()]).then(() => {
    renderCart();
  });

  renderCart();
});

// делаем функции доступными глобально для inline onclick
window.openProductModal = openProductModal;
window.updateQty = updateQty;
window.removeItem = removeItem;
