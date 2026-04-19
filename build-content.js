#!/usr/bin/env node
/**
 * Собирает products.json из content/products/*.json
 * Также собирает settings.json из content/settings/*.json
 * Запускается Netlify при каждом деплое.
 */
const fs = require('fs');
const path = require('path');

// --- Товары ---
const productsDir = path.join(__dirname, 'content', 'products');
const products = [];

if (fs.existsSync(productsDir)) {
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));
  files.sort();
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(productsDir, file), 'utf-8');
      const data = JSON.parse(raw);
      // Преобразуем абсолютные пути картинок обратно в имена файлов
      if (Array.isArray(data.images)) {
        data.images = data.images.map(img => {
          if (typeof img === 'string' && img.startsWith('/images/products/')) {
            return img.replace('/images/products/', '');
          }
          // картинка загружена через админку — путь /images/uploads/...
          return img;
        });
      }
      // Сглаживаем списки sizes и colors (они в админке сохраняются как массив объектов)
      if (Array.isArray(data.sizes)) {
        data.sizes = data.sizes.map(s => typeof s === 'object' && s !== null ? (s.size || s.text || '') : s).filter(Boolean);
      }
      if (Array.isArray(data.colors)) {
        data.colors = data.colors.map(c => typeof c === 'object' && c !== null ? (c.color || c.text || '') : c).filter(Boolean);
      }
      // category_ru заполним из category
      const CAT_RU = {
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
      data.category_ru = CAT_RU[data.category] || data.category;
      products.push(data);
    } catch (e) {
      console.error(`Ошибка в ${file}: ${e.message}`);
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, 'products.json'),
  JSON.stringify(products, null, 2),
  'utf-8'
);
console.log(`✓ products.json: ${products.length} товаров`);

// --- Настройки (склеиваем в один settings.json) ---
const settingsDir = path.join(__dirname, 'content', 'settings');
const settings = {};
if (fs.existsSync(settingsDir)) {
  const files = fs.readdirSync(settingsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const key = file.replace('.json', '');
    try {
      settings[key] = JSON.parse(fs.readFileSync(path.join(settingsDir, file), 'utf-8'));
    } catch (e) {
      console.error(`Ошибка в настройках ${file}: ${e.message}`);
    }
  }
}
fs.writeFileSync(
  path.join(__dirname, 'settings.json'),
  JSON.stringify(settings, null, 2),
  'utf-8'
);
console.log(`✓ settings.json: ${Object.keys(settings).length} блоков`);
