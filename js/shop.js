// ============================================
// Каталог: фильтры, сортировка, рендер
// ============================================

const CATEGORY_RU = {
  'grips': 'Накладки',
  'sleeves': 'Наколенники и налокотники',
  'belts': 'Пояса',
  'jumpropes': 'Скакалки',
  'wraps': 'Кистевые бинты',
  'bags': 'Рюкзаки и сумки',
  'apparel-men': 'Одежда мужская',
  'apparel-women': 'Одежда женская',
  'accessories': 'Аксессуары',
  'extras': 'Дополнительно',
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

  // считаем сколько товаров в каждой категории
  const catCounts = {};
  products.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });

  // рендер фильтра категорий
  const catList = document.getElementById('filterCategories');
  let catHtml = `<label><input type="radio" name="cat" value="all" ${state.category === 'all' ? 'checked' : ''}> Все <span class="filter-count">${products.length}</span></label>`;
  Object.keys(CATEGORY_RU).forEach(key => {
    if (!catCounts[key]) return;
    catHtml += `<label><input type="radio" name="cat" value="${key}" ${state.category === key ? 'checked' : ''}> ${CATEGORY_RU[key]} <span class="filter-count">${catCounts[key]}</span></label>`;
  });
  catList.innerHTML = catHtml;

  // слушатели
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
  if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (state.sort === 'name') list.sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'));

  const grid = document.getElementById('shopGrid');
  const count = document.getElementById('shopCount');
  count.textContent = `${list.length} ${declOfNum(list.length, ['товар','товара','товаров'])}`;

  if (!list.length) {
    grid.innerHTML = '<div class="shop-empty">По выбранным фильтрам ничего не найдено</div>';
    return;
  }
  grid.innerHTML = list.map(renderProductCard).join('');
}

function declOfNum(n, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[Math.min(n % 10, 5)]];
}
