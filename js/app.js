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
          t.classList.remove('visible');
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
// isHover=true — тултип не исчезает автоматически (для hover на десктопе), убирается через mouseleave
function showColorTooltip(targetEl, fullName, isHover) {
  // Удаляем предыдущие всплывашки этого типа
  if (isHover) {
    document.querySelectorAll('.color-tooltip.hover-tooltip').forEach(t => t.remove());
  } else {
    document.querySelectorAll('.color-tooltip:not(.hover-tooltip)').forEach(t => t.remove());
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'color-tooltip' + (isHover ? ' hover-tooltip' : '');
  tooltip.textContent = fullName;
  document.body.appendChild(tooltip);

  // Позиционируем над кнопкой
  const rect = targetEl.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left + (rect.width - tooltipRect.width) / 2;
  // Не выходим за края экрана
  const margin = 8;
  if (left < margin) left = margin;
  if (left + tooltipRect.width > window.innerWidth - margin) {
    left = window.innerWidth - tooltipRect.width - margin;
  }
  const top = rect.top - tooltipRect.height - 8;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top < 8 ? rect.bottom + 8 : top}px`;

  // Появление с анимацией
  requestAnimationFrame(() => tooltip.classList.add('visible'));

  // Только для тапа (не hover) — убираем через 1.5 секунды
  if (!isHover) {
    setTimeout(() => {
      tooltip.classList.remove('visible');
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

// Строит блок "Вам ещё может понравиться" — 6 фиксированных слотов
function buildRecommendations(currentProduct) {
  if (!currentProduct) return null;
  // Для аксессуаров (брелки, носки, рюкзаки) рекомендации не показываем
  if (currentProduct.category === 'accessories') return null;

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

  const cardsHtml = finalSlots.map(p => {
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

  // Возвращаем объект — есть "встроенный" блок (для мобилы) и только сетка карточек (для боковой колонки на десктопе)
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

  // Используем orderTelegramUrl (личный TG для заказов), а если его нет — обычный telegramUrl
  const targetUrl = SHOP_CONFIG.orderTelegramUrl || SHOP_CONFIG.telegramUrl;
  const url = `${targetUrl}?text=${encodeURIComponent(msg)}`;
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

  renderCart();
});

// делаем функции доступными глобально для inline onclick
window.openProductModal = openProductModal;
window.updateQty = updateQty;
window.removeItem = removeItem;
