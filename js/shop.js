// ============================================
// Каталог: фильтры, сортировка, рендер
// ============================================

const CATEGORY_RU = {
  'gear': 'Экипировка',
  'apparel': 'Одежда',
  'accessories': 'Аксессуары',
  'equipment': 'Оборудование',
};

const state = {
  category: 'all',
  price: 'all',
  sort: 'default',
};

// Парсим query string
const params = new URLSearchParams(location.search);
if (params.get('cat')) state.category = params.get('cat');

(async function init() {
  const products = await loadProducts();

  const catCounts = {};
  products.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });

  const catList = document.getElementById('filterCategories');
  let catHtml = `<label><input type="radio" name="cat" value="all" ${state.category === 'all' ? 'checked' : ''}> Все <span class="filter-count">${products.length}</span></label>`;
  Object.keys(CATEGORY_RU).forEach(key => {
    if (!catCounts[key]) return;
    catHtml += `<label><input type="radio" name="cat" value="${key}" ${state.category === key ? 'checked' : ''}> ${CATEGORY_RU[key]} <span class="filter-count">${catCounts[key]}</span></label>`;
  });
  catList.innerHTML = catHtml;

  catList.addEventListener('change', e => {
    state.category = e.target.value;
    updateTitle();
    render();
  });
  document.querySelectorAll('input[name="price"]').forEach(el => {
    el.addEventListener('change', e => { state.price = e.target.value; render(); });
  });
  document.getElementById('shopSort').addEventListener('change', e => {
    state.sort = e.target.value;
    render();
  });

  updateTitle();
  render();
})();

function updateTitle() {
  const t = document.getElementById('shopTitle');
  const s = document.getElementById('shopSubtitle');
  if (state.category === 'all') {
    t.textContent = 'Каталог';
    s.textContent = 'Экипировка для тех, кто тренируется всерьёз';
  } else {
    t.textContent = CATEGORY_RU[state.category] || 'Каталог';
    s.textContent = '';
  }
}

function matchesFilters(p) {
  if (state.category !== 'all' && p.category !== state.category) return false;
  if (state.price !== 'all') {
    const pr = p.price;
    if (state.price === 'lt1000' && pr >= 1000) return false;
    if (state.price === '1000-3000' && (pr < 1000 || pr > 3000)) return false;
    if (state.price === '3000-7000' && (pr < 3000 || pr > 7000)) return false;
    if (state.price === 'gt7000' && pr < 7000) return false;
  }
  return true;
}

function render() {
  let list = PRODUCTS.filter(matchesFilters);

  if (state.sort === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sort === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else {
    list = sortByDefault(list, state.category);
  }

  const grid = document.getElementById('shopGrid');
  const count = document.getElementById('shopCount');
  count.textContent = `${list.length} ${declOfNum(list.length, ['товар','товара','товаров'])}`;

  if (!list.length) {
    grid.innerHTML = '<div class="shop-empty">По выбранным фильтрам ничего не найдено</div>';
    return;
  }
  grid.innerHTML = list.map(renderProductCard).join('');
}

// ============================================
// Умная сортировка по умолчанию (по группам)
// ============================================

// Жёсткие правила: ID товара → его место в группе. Меньше число = раньше показывается.
// Все ID должны быть в нижнем регистре.
const ORDER_BY_ID = {
  // ===== НАКЛАДКИ =====
  'elite-sticky-grips': 100,
  'xpodium-sticky-grips': 110,
  'xpodium-carbon-grips': 120,
  'xpodium-carbon-grips-with-hole': 121,
  'xpodium-3-0-grip-black': 130,
  'xpodium-3-0-grip-white': 131,
  'suede-grip': 140,
  'suede-grip-with-hole': 141,

  // ===== ОДЕЖДА: МУЖСКОЙ ВЕРХ =====
  'pro-t-shirts': 200,
  'pro-vest': 210,
  'light-fit-t-shirt': 220,
  '3-4-sleeves-t-shirt': 230,
  'oversized-shirts': 240,
  'oversized-shirts-big-logo': 241,
  'oversized-shirts-small-logo': 242,

  // ===== ХУДИ =====
  'hoodie': 300,
  'basic-logo-hoodie': 310,

  // ===== МУЖСКОЙ НИЗ (шорты/штаны) =====
  'shorts-1-0': 400,
  'shorts-2-0': 410,
  'shorts-3-0': 420,
  'compression-shorts': 430,
  'long-pants': 440,

  // ===== ЖЕНСКИЙ ВЕРХ =====
  'sports-bra': 500,
  'girls-vest': 510,
  'girls-t-shirts': 520,
  '3-4-sleeves-t-shirt-shorts': 530, // помечено как мужская в JSON, но это «футболка 3/4 (женская)» по name_ru

  // ===== ЖЕНСКИЙ НИЗ =====
  'leggings-short': 600,
  'leggings-long': 610,
  'zhenskiy-kostyum-xpodium': 620,

  // ===== НОСКИ =====
  'basic-logo-socks': 700,
  'lifting-socks': 710,
  'weightlifting-socks': 720,

  // ===== НАКОЛЕННИКИ / НАЛОКОТНИКИ =====
  'knee-sleeves-1-0': 800,
  'knee-sleeves-2-0': 810,
  'knee-sleeves-3-0': 820,
  'ultra-knee-leeves': 830,
  'elbow-sleeves-3-0': 840,

  // ===== РЮКЗАКИ =====
  'backpack-1-0': 900,
  'backpack-2-0': 910,
  'backpack-medium-small': 920,
  'mini-backpack': 930,
  'satchel': 940,

  // ===== СКАКАЛКИ =====
  'jump-rope': 1000,
  'jump-rope-2-0': 1010,

  // ===== ОСТАЛЬНАЯ ЭКИПИРОВКА =====
  'pr-belt': 1100,
  'wristband-1-0': 1110,
  'wristband-2-0': 1120,
  'wristband-2-0-2': 1121,
  'wristband-3-0': 1130,
  'sweat-band': 1140,
  'head-bands': 1150,

  // ===== АКСЕССУАРЫ (мелочи) =====
  'cap-big-logo': 1200,
  'cap-small-logo': 1210,
  'sport-bottle': 1220,
  'chalk': 1230,
  'massage-ball': 1240,
  'montrigger': 1250,
  'lifting-strap': 1260,
  'alluminium-barbell-clips': 1270,
  'plastic-barbell-clips': 1280,
  'plastic-spring-barbell-clips': 1290,
  'plate-velcro': 1300,
  'xpodium-velcro': 1310,
  'xpodium-velcro-2': 1320,
  'panda-velcro': 1330,
  'key-ring': 1340,
  'hookgrip-tape': 1350,
};

// Вспомогательные множества по группам — для специальных категорий
const GRIPS_IDS = ['elite-sticky-grips', 'xpodium-sticky-grips', 'xpodium-carbon-grips', 'xpodium-carbon-grips-with-hole', 'xpodium-3-0-grip-black', 'xpodium-3-0-grip-white', 'suede-grip', 'suede-grip-with-hole'];
const SLEEVES_IDS = ['knee-sleeves-1-0', 'knee-sleeves-2-0', 'knee-sleeves-3-0', 'ultra-knee-leeves', 'elbow-sleeves-3-0'];
const JUMPROPE_IDS = ['jump-rope', 'jump-rope-2-0'];
const BACKPACK_IDS = ['backpack-1-0', 'backpack-2-0', 'backpack-medium-small', 'mini-backpack', 'satchel'];

function getGroupOrder(id) {
  // Если есть в нашем словаре — берём оттуда
  if (ORDER_BY_ID[id] !== undefined) return ORDER_BY_ID[id];
  // Если нет — кидаем в самый конец (но всё равно стабильно)
  return 99999;
}

function sortByDefault(list, category) {
  // 1) Сначала отдаём приоритет ручному sort_index из админки (если задан)
  // 2) Потом сортируем по группе из ORDER_BY_ID
  // 3) При равенстве — по name_ru

  const sorted = [...list].sort((a, b) => {
    const aManual = typeof a.sort_index === 'number';
    const bManual = typeof b.sort_index === 'number';
    if (aManual && bManual) return a.sort_index - b.sort_index;
    if (aManual) return -1;
    if (bManual) return 1;

    // Группа из словаря
    const aOrder = getGroupOrder(a.id);
    const bOrder = getGroupOrder(b.id);
    if (aOrder !== bOrder) return aOrder - bOrder;

    // По name_ru если в одной группе
    return (a.name_ru || '').localeCompare(b.name_ru || '', 'ru');
  });

  return sorted;
}

function declOfNum(n, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[Math.min(n % 10, 5)]];
}
