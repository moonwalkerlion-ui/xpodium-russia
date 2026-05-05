// Главная: рендер хитов продаж
// Источник ID — настройки сайта (settings.home.best_sellers), либо дефолтный список
(async function() {
  const products = await loadProducts();
  const grid = document.getElementById('bestSellers');
  if (!grid) return;

  // Ждём пока settings-loader подгрузит SETTINGS
  // Используем небольшой таймаут на случай если settings ещё грузятся
  let attempts = 0;
  while (typeof SETTINGS === 'undefined' && attempts < 20) {
    await new Promise(r => setTimeout(r, 50));
    attempts++;
  }

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

  // Из settings.home.best_sellers — массив объектов {id: "..."} или строк
  let pickIds = defaultIds;
  if (typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.home && Array.isArray(SETTINGS.home.best_sellers) && SETTINGS.home.best_sellers.length) {
    pickIds = SETTINGS.home.best_sellers.map(item =>
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
