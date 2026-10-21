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
// Страницы для превью ссылок в мессенджерах: p/<id>.html
// ============================================
// Telegram, WhatsApp, VK и т.п. не запускают JavaScript, а читают только
// метатеги og:* из HTML. У каталога один файл shop.html на все товары,
// поэтому для каждого товара собираем маленькую страницу со своими
// названием, ценой и фото. Человека она сразу перекидывает в каталог
// на этот товар, а боту превью (см. .htaccess) отдаётся вместо shop.html.
const SITE_URL = 'https://xpodium-russia.online';

function escAttr(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function rub(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
}
function ogImageUrl(img) {
  if (!img) return `${SITE_URL}/images/categories/gear.webp`;
  if (/^https?:\/\//.test(img)) return img;
  const rel = img.startsWith('/') ? img.slice(1) : (img.includes('/') ? img : `images/products/${img}`);
  return `${SITE_URL}/${encodeURI(rel)}`;
}
function ogPriceText(p) {
  const prices = Array.isArray(p.size_prices)
    ? p.size_prices.map(x => Number(x && x.price)).filter(n => n > 0) : [];
  if (prices.length) {
    const min = Math.min(...prices);
    return prices.some(n => n !== min) ? `от ${rub(min)}` : rub(min);
  }
  return Number(p.price) > 0 ? rub(p.price) : '';
}
// Первый обычный абзац описания (без списков и подзаголовков), не длиннее ~160 символов
function ogShortText(p) {
  const lines = String(p.description || '').replace(/\r\n?/g, '\n').split('\n').map(l => l.trim());
  const firstPara = [];
  for (const l of lines) {
    if (!l) { if (firstPara.length) break; continue; }
    if (/^[•·▪●◦*\-–—]/.test(l) || /[:：]$/.test(l)) { if (firstPara.length) break; continue; }
    firstPara.push(l);
  }
  let t = firstPara.join(' ').replace(/\s+/g, ' ').trim();
  if (t.length > 160) t = t.slice(0, 160).replace(/\s+\S*$/, '') + '…';
  return t;
}

const pagesDir = path.join(__dirname, 'p');
fs.rmSync(pagesDir, { recursive: true, force: true });
fs.mkdirSync(pagesDir, { recursive: true });

for (const p of products) {
  const name = p.name_ru || p.name_en || 'XPODIUM';
  const price = ogPriceText(p);
  const short = ogShortText(p) || `${p.category_ru || 'XPODIUM'}. Официальный представитель XPODIUM в России, доставка по России и СНГ.`;
  const desc = price ? `${price} · ${short}` : short;
  const image = ogImageUrl(p.images && p.images[0]);
  const target = `/shop.html?cat=${encodeURIComponent(p.category || '')}&product=${encodeURIComponent(p.id)}`;
  const pageUrl = `${SITE_URL}/p/${encodeURIComponent(p.id)}.html`;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escAttr(name)} — XPODIUM RUSSIA</title>
<meta name="description" content="${escAttr(desc)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${escAttr(SITE_URL + target)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="XPODIUM RUSSIA">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${escAttr(name)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:url" content="${escAttr(pageUrl)}">
<meta property="og:image" content="${escAttr(image)}">
<meta property="og:image:alt" content="${escAttr(name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(name)}">
<meta name="twitter:description" content="${escAttr(desc)}">
<meta name="twitter:image" content="${escAttr(image)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta http-equiv="refresh" content="0; url=${escAttr(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<p><a href="${escAttr(target)}">${escAttr(name)}</a></p>
</body>
</html>
`;
  fs.writeFileSync(path.join(pagesDir, `${p.id}.html`), html);
}
console.log(`✓ p/: ${products.length} страниц для превью ссылок`);

// Правило для ботов превью дописываем в .htaccess при сборке на GitHub
// (файл в репозитории не меняется, правится только копия, которая уходит на хостинг).
// Боту, который строит превью ссылки shop.html?product=ID, сервер отдаёт p/ID.html.
const HTACCESS_MARK = '# [xpodium] превью ссылок на товары в мессенджерах';
const htFile = path.join(__dirname, '.htaccess');
let ht = fs.existsSync(htFile) ? fs.readFileSync(htFile, 'utf-8') : '';
if (!ht.includes(HTACCESS_MARK)) {
  const rule = [
    HTACCESS_MARK,
    'RewriteCond %{HTTP_USER_AGENT} (TelegramBot|WhatsApp|facebookexternalhit|Facebot|Twitterbot|vkShare|Viber|Discordbot|Slackbot|LinkedInBot|SkypeUriPreview|Pinterest|OdklBot|redditbot|Iframely) [NC]',
    'RewriteCond %{QUERY_STRING} (^|&)product=([A-Za-z0-9_-]+)',
    'RewriteCond %{DOCUMENT_ROOT}/p/%2.html -f',
    'RewriteCond %{QUERY_STRING} (^|&)product=([A-Za-z0-9_-]+)',
    'RewriteRule ^((shop|index)(\\.html)?)?$ p/%2.html [L]',
  ].join('\n');
  const engineRe = /^([ \t]*RewriteEngine[ \t]+On[ \t]*)$/mi;
  ht = engineRe.test(ht)
    ? ht.replace(engineRe, `$1\n\n${rule}\n`)
    : `RewriteEngine On\n\n${rule}\n\n${ht}`;
  fs.writeFileSync(htFile, ht);
  console.log('✓ .htaccess: добавлено правило превью ссылок');
}

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
