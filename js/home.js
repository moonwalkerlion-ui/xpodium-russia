// Главная: рендер хитов продаж (первые 8 товаров из разных категорий)
(async function() {
  const products = await loadProducts();
  const grid = document.getElementById('bestSellers');
  if (!grid) return;

  // выбираем "хиты" — разнообразно из разных категорий
  const pickIds = [
    'xpodium-sticky-grips',
    'pr-belt',
    'knee-sleeves-3-0',
    'jump-rope',
    'backpack-2-0',
    'hoodie',
    'pro-t-shirts',
    'mini-backpack',
  ];
  let picks = pickIds.map(id => products.find(p => p.id === id)).filter(Boolean);
  // добиваем до 8 первыми из каталога если не хватает
  if (picks.length < 8) {
    const extras = products.filter(p => !pickIds.includes(p.id)).slice(0, 8 - picks.length);
    picks = picks.concat(extras);
  }
  grid.innerHTML = picks.map(renderProductCard).join('');
})();
