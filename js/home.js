// Главная: рендер хитов продаж
// Источник ID — настройки сайта (settings.home.best_sellers), либо дефолтный список
(async function() {
  // Запускаем параллельно загрузку товаров и настроек
  const productsPromise = loadProducts();

  // Гарантированно ждём settings.json (если loadSettings есть и SETTINGS ещё нет)
  let settingsPromise;
  if (typeof loadSettings === 'function' && typeof SETTINGS === 'undefined') {
    settingsPromise = loadSettings();
  } else if (typeof SETTINGS !== 'undefined' && SETTINGS) {
    settingsPromise = Promise.resolve(SETTINGS);
  } else {
    // Фоллбэк: грузим settings.json напрямую
    settingsPromise = fetch('settings.json?v=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
  }

  const [products, settings] = await Promise.all([productsPromise, settingsPromise]);
  const grid = document.getElementById('bestSellers');
  if (!grid) return;

  // Дефолтные хиты (если в админке не задано)
  const defaultIds = [
    'xpodium-sticky-grips',
    'pr-belt',
    'knee-sleeves-3-0',
    'jump-rope',
    'backpack-2-0',
    'hoodie',
    'pro-t-shirts',
    'mini-backpack',
  ];

  // Из settings.home.best_sellers
  let pickIds = defaultIds;
  const cfg = (settings && settings.home) || (typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.home) || null;
  if (cfg && Array.isArray(cfg.best_sellers) && cfg.best_sellers.length) {
    pickIds = cfg.best_sellers.map(item =>
      typeof item === 'object' && item !== null ? (item.id || '') : String(item)
    ).filter(Boolean);
  }

  let picks = pickIds.map(id => products.find(p => p.id === id)).filter(Boolean);

  // Если меньше 8 — добиваем первыми из каталога
  if (picks.length < 8) {
    const extras = products.filter(p => !pickIds.includes(p.id)).slice(0, 8 - picks.length);
    picks = picks.concat(extras);
  }

  grid.innerHTML = picks.map(renderProductCard).join('');
})();
