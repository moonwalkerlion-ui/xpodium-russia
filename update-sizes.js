// =========================================================
// update-sizes.js — bulk-обновление товаров
// Запусти из корня проекта на маке:
//   1) Открой Терминал (Cmd+Space → "Терминал")
//   2) cd ~/путь/к/папке/xpodium-russia
//   3) node update-sizes.js
//   4) Закоммить изменения через GitHub Desktop
//
// Скрипт:
//   • Помечает указанные товары как унисекс
//   • Унифицирует размеры у части унисекс-товаров до M, L, XL, XXL
//   • Добавляет XXL мужской одежде где уже есть XL
//   • Добавляет XL всем накладкам
//   • Не трогает товары с нестандартными размерами (детские, "Size 1" и т.п.)
// =========================================================

const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.join(__dirname, 'content', 'products');

// ID унисекс-товаров с УНИФИКАЦИЕЙ размеров до M, L, XL, XXL
const UNISEX_UNIFY_SIZES = [
  'basic-logo-hoodie',   // Худи Basic Logo
  'light-fit-t-shirt',   // Футболка Light-fit
  'long-pants',          // Спортивные брюки (бывш. Штаны длинные)
];

// ID унисекс-товаров БЕЗ изменения размеров (только пометка)
const UNISEX_KEEP_SIZES = [
  'hoodie',                  // Худи
  '3-4-sleeves-t-shirt',     // Футболка с рукавом 3/4 (унисекс)
  'basic-logo-socks',        // Носки basic logo
  'lifting-socks',           // Носки lifting
  'weightlifting-socks',     // Носки weightlifting
];

const ALL_UNISEX = [...UNISEX_UNIFY_SIZES, ...UNISEX_KEEP_SIZES];
const UNIFIED_SIZES = ['M', 'L', 'XL', 'XXL'];

// Утилиты: размеры могут быть массивом строк или массивом объектов {size: "XS"}
function getSizesAsStrings(sizes) {
  if (!Array.isArray(sizes)) return [];
  return sizes
    .map(s => typeof s === 'object' && s !== null ? (s.size || '') : String(s))
    .filter(Boolean);
}

function setSizes(product, sizesArray) {
  // Сохраняем в том же формате что был
  const wasObjects = Array.isArray(product.sizes)
    && product.sizes.length > 0
    && typeof product.sizes[0] === 'object'
    && product.sizes[0] !== null;
  if (wasObjects) {
    product.sizes = sizesArray.map(s => ({ size: s }));
  } else {
    product.sizes = [...sizesArray];
  }
}

// Проверяем что не пытаемся обрабатывать папку которой нет
if (!fs.existsSync(PRODUCTS_DIR)) {
  console.error(`✗ Не найдена папка ${PRODUCTS_DIR}`);
  console.error('  Запусти скрипт из корня репозитория (где лежит content/)');
  process.exit(1);
}

const allFiles = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json'));
console.log(`Найдено товаров: ${allFiles.length}\n`);

const stats = {
  unisex_marked: 0,
  unisex_sizes_unified: 0,
  men_xxl_added: 0,
  grips_xl_added: 0,
  skipped_men_no_xl: [],
  skipped_unisex_wrong_subcategory: [],
};

allFiles.forEach(filename => {
  const filepath = path.join(PRODUCTS_DIR, filename);
  const raw = fs.readFileSync(filepath, 'utf-8');
  let product;
  try {
    product = JSON.parse(raw);
  } catch (e) {
    console.error(`  ✗ Ошибка парсинга ${filename}: ${e.message}`);
    return;
  }

  const id = product.id || filename.replace(/\.json$/, '');
  let changed = false;
  const messages = [];

  // 1. Помечаем унисекс
  if (ALL_UNISEX.includes(id)) {
    if (!product.unisex) {
      product.unisex = true;
      changed = true;
      messages.push('помечен унисекс');
      stats.unisex_marked++;
    }
    // Унифицируем размеры
    if (UNISEX_UNIFY_SIZES.includes(id)) {
      const current = getSizesAsStrings(product.sizes);
      const isSame = current.length === UNIFIED_SIZES.length
        && current.every((v, i) => v === UNIFIED_SIZES[i]);
      if (!isSame) {
        setSizes(product, UNIFIED_SIZES);
        changed = true;
        messages.push(`размеры: [${current.join(', ')}] → [${UNIFIED_SIZES.join(', ')}]`);
        stats.unisex_sizes_unified++;
      }
    }
  }

  // 2. Мужская одежда — добавить XXL если есть XL и нет XXL
  if (product.subcategory === 'apparel-men' && !ALL_UNISEX.includes(id)) {
    const current = getSizesAsStrings(product.sizes);
    const hasXL = current.some(s => s.toUpperCase() === 'XL');
    const hasXXL = current.some(s => {
      const up = s.toUpperCase();
      return up === 'XXL' || up === '2XL' || /2.*EXTRA.*LARGE/.test(up);
    });
    if (hasXL && !hasXXL) {
      setSizes(product, [...current, 'XXL']);
      changed = true;
      messages.push(`+XXL (было: ${current.join(', ')})`);
      stats.men_xxl_added++;
    } else if (!hasXL) {
      stats.skipped_men_no_xl.push(product.name_ru || id);
    }
  }

  // 3. Накладки — добавить XL если нет
  if (product.subcategory === 'grips') {
    const current = getSizesAsStrings(product.sizes);
    const hasXL = current.some(s => s.toUpperCase() === 'XL');
    if (!hasXL) {
      setSizes(product, [...current, 'XL']);
      changed = true;
      messages.push(`+XL (было: ${current.join(', ')})`);
      stats.grips_xl_added++;
    }
  }

  if (changed) {
    fs.writeFileSync(filepath, JSON.stringify(product, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ ${product.name_ru || id}`);
    messages.forEach(m => console.log(`      → ${m}`));
  }
});

console.log('\n=========================================');
console.log('РЕЗУЛЬТАТ:');
console.log(`  • Помечено унисекс: ${stats.unisex_marked}`);
console.log(`  • Унисекс — размеры унифицированы: ${stats.unisex_sizes_unified}`);
console.log(`  • Мужским добавлен XXL: ${stats.men_xxl_added}`);
console.log(`  • Накладкам добавлен XL: ${stats.grips_xl_added}`);

if (stats.skipped_men_no_xl.length) {
  console.log('\n  Не тронуто (нет размера XL в мужской одежде):');
  stats.skipped_men_no_xl.forEach(n => console.log(`    • ${n}`));
}

console.log('\nГотово. Открой GitHub Desktop, проверь изменения, закоммить.');
