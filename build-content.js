// build-content.js — собирает products.json и settings.json
// из отдельных файлов в content/ для использования на сайте
const fs = require('fs');
const path = require('path');

// ============================================
// Транслитерация кириллицы в латиницу для id товара
// ============================================
const TRANSLIT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
  'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
  'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
};
function transliterate(str) {
  return String(str).toLowerCase().split('').map(c => {
    if (TRANSLIT[c] !== undefined) return TRANSLIT[c];
    return c;
  }).join('');
}
function makeSlugFromName(name) {
  return transliterate(name)
    .replace(/[^a-z0-9]+/g, '-')   // всё кроме латиницы и цифр → тире
    .replace(/^-+|-+$/g, '')       // убираем тире по краям
    .replace(/-+/g, '-');          // схлопываем множественные тире
}

// ============================================
// Загружаем настройки категорий заранее
// ============================================
let CAT_RU = {
  'gear': 'Экипировка',
  'apparel': 'Одежда',
  'accessories': 'Аксессуары',
  'equipment': 'Оборудование',
};
const categoriesFile = path.join(__dirname, 'content', 'settings', 'categories.json');
if (fs.existsSync(categoriesFile)) {
  try {
    const cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));
    if (Array.isArray(cats.items)) {
      for (const c of cats.items) {
        if (c.id && c.label) CAT_RU[c.id] = c.label;
      }
    }
  } catch (e) {
    console.error(`Ошибка чтения categories.json: ${e.message}`);
  }
}

// ============================================
// Товары
// ============================================
const productsDir = path.join(__dirname, 'content', 'products');
const products = [];

if (fs.existsSync(productsDir)) {
  // sort_index — числовая позиция товара в каталоге, для ручной сортировки
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(productsDir, file), 'utf-8');
      const data = JSON.parse(raw);

      // ============= ID =============
      // Если id не задан — генерируем из имени файла (с транслитерацией кириллицы)
      if (!data.id) {
        const fileSlug = file.replace(/\.json$/, '');
        // Если в имени файла кириллица — транслитерируем
        if (/[а-яёА-ЯЁ]/.test(fileSlug)) {
          data.id = makeSlugFromName(fileSlug);
        } else {
          data.id = fileSlug;
        }
      }
      // На всякий случай — id всегда нормализуем (без пробелов и спецсимволов)
      data.id = String(data.id).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
      // Если после нормализации id пустой — фоллбэк
      if (!data.id) data.id = `product-${products.length}`;

      // ============= СГЛАЖИВАЕМ images =============
      // Поддерживаем разные форматы:
      // 1) ["path/to.webp"] — простые строки
      // 2) [{ image: "path/to.webp" }] — массив объектов (формат Decap CMS)
      if (Array.isArray(data.images)) {
        data.images = data.images
          .map(img => {
            if (typeof img === 'string') return img;
            if (typeof img === 'object' && img !== null) return img.image || img.url || img.src || '';
            return '';
          })
          .filter(Boolean)
          .map(img => {
            // /images/products/foo.webp → foo.webp (для совместимости с product-image-url)
            if (img.startsWith('/images/products/')) {
              return img.replace('/images/products/', '');
            }
            // /images/uploads/foo.jpg оставляем как есть (полный путь)
            return img;
          });
      }

      // sizes и colors могут быть массивами объектов из Decap
      if (Array.isArray(data.sizes)) {
        data.sizes = data.sizes.map(s => typeof s === 'object' && s !== null ? (s.size || s.text || '') : s).filter(Boolean);
      }
      if (Array.isArray(data.colors)) {
        data.colors = data.colors.map(c => typeof c === 'object' && c !== null ? (c.color || c.text || '') : c).filter(Boolean);
      }

      // category_ru
      data.category_ru = CAT_RU[data.category] || data.category || '';

      // ============= СКРЫТЫЕ ТОВАРЫ =============
      // Если у товара hidden: true — пропускаем
      if (data.hidden === true) {
        continue;
      }

      products.push(data);
    } catch (e) {
      console.error(`Ошибка в ${file}: ${e.message}`);
    }
  }
}

// Сортировка товаров: сначала те у кого задан sort_index, потом остальные по name_ru
products.sort((a, b) => {
  const aHas = typeof a.sort_index === 'number';
  const bHas = typeof b.sort_index === 'number';
  if (aHas && bHas) return a.sort_index - b.sort_index;
  if (aHas) return -1;
  if (bHas) return 1;
  return (a.name_ru || '').localeCompare(b.name_ru || '', 'ru');
});

fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2));
console.log(`✓ products.json: ${products.length} товаров`);

// ============================================
// Настройки
// ============================================
const settingsDir = path.join(__dirname, 'content', 'settings');
const settings = {};

if (fs.existsSync(settingsDir)) {
  const files = fs.readdirSync(settingsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(settingsDir, file), 'utf-8');
      const key = file.replace(/\.json$/, '');
      settings[key] = JSON.parse(raw);
    } catch (e) {
      console.error(`Ошибка в ${file}: ${e.message}`);
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'settings.json'), JSON.stringify(settings, null, 2));
console.log(`✓ settings.json: ${Object.keys(settings).length} блоков`);
