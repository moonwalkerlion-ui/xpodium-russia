// Главная: рендер хитов продаж
// Источник ID — настройки сайта (settings.home.best_sellers)
(async function() {
  // Запускаем параллельно загрузку товаров и настроек
  const productsPromise = loadProducts();

  // Гарантированно ждём settings.json
  let settingsPromise;
  if (typeof loadSettings === 'function' && typeof SETTINGS === 'undefined') {
    settingsPromise = loadSettings();
  } else if (typeof SETTINGS !== 'undefined' && SETTINGS) {
    settingsPromise = Promise.resolve(SETTINGS);
  } else {
    settingsPromise = fetch('settings.json?v=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
  }

  const [products, settings] = await Promise.all([productsPromise, settingsPromise]);
  const grid = document.getElementById('bestSellers');
  if (!grid) return;

  // Получаем список ID хитов из админки
  const cfg = (settings && settings.home) || (typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.home) || null;

  let pickIds = [];
  if (cfg && Array.isArray(cfg.best_sellers) && cfg.best_sellers.length) {
    pickIds = cfg.best_sellers.map(item =>
      typeof item === 'object' && item !== null ? (item.id || '') : String(item)
    ).filter(Boolean);
  }

  // Если в админке хиты не заданы — берём первые 8 товаров из каталога
  if (!pickIds.length) {
    const picks = products.slice(0, 8);
    grid.innerHTML = picks.map(renderProductCard).join('');
    return;
  }

  // Сопоставляем ID → товар. Если ID не найден — пропускаем + предупреждаем в консоли
  const picks = [];
  const seen = new Set();
  for (const id of pickIds) {
    if (seen.has(id)) {
      console.warn(`[Хиты] Дубликат ID "${id}" — пропущен`);
      continue;
    }
    seen.add(id);
    const product = products.find(p => p.id === id);
    if (!product) {
      console.warn(`[Хиты] Товар с ID "${id}" не найден в каталоге — проверь админку`);
      continue;
    }
    picks.push(product);
  }

  if (!picks.length) {
    // Все ID битые — показываем первые 8 чтобы блок не был пустым
    grid.innerHTML = products.slice(0, 8).map(renderProductCard).join('');
    return;
  }

  grid.innerHTML = picks.map(renderProductCard).join('');
})();
