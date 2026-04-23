#!/usr/bin/env node
/**
 * Перенос фото из content/products_new/ в images/products/
 *
 * Что делает:
 * 1. Читает все файлы из content/products/*.json (источник данных товаров)
 * 2. Для каждого товара с полем _new_folder — берёт фото из content/products_new/<folder>/
 * 3. Сжимает в WebP (1000px по длинной стороне, качество 85)
 * 4. Сохраняет как <slug>.webp, <slug>-2.webp, <slug>-3.webp и т.д.
 *    (порядок — по алфавиту имён файлов; 1.jpg, 2.jpg будут первыми)
 * 5. Обновляет поле "images" в JSON-файле товара, удаляет _new_folder и _extra_folders
 * 6. В конце запускает build-content.js чтобы обновить products.json
 *
 * Запуск (из корня репозитория):
 *    node migrate-photos.js
 *
 * Требует: npm install sharp (делает автоматически при первом запуске)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Проверяем / устанавливаем sharp (библиотека для работы с картинками)
try {
  require.resolve('sharp');
} catch {
  console.log('Устанавливаю библиотеку sharp для обработки картинок (~10 сек)...');
  execSync('npm install sharp --no-save', { stdio: 'inherit' });
}
const sharp = require('sharp');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'content', 'products_new');
const PRODUCTS_DIR = path.join(ROOT, 'content', 'products');
const DST_DIR = path.join(ROOT, 'images', 'products');

const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

function listImages(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder)
    .filter(f => IMG_EXTS.includes(path.extname(f).toLowerCase()))
    .filter(f => !f.startsWith('.'))
    .sort();
}

async function processImage(srcPath, dstPath) {
  try {
    await sharp(srcPath)
      .rotate()
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dstPath);
    return true;
  } catch (e) {
    console.error(`  ✗ Ошибка при обработке ${path.basename(srcPath)}: ${e.message}`);
    return false;
  }
}

(async () => {
  console.log('🔍 Читаю файлы товаров из content/products/...');

  if (!fs.existsSync(DST_DIR)) fs.mkdirSync(DST_DIR, { recursive: true });

  const productFiles = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json'));

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const productFile of productFiles) {
    const productPath = path.join(PRODUCTS_DIR, productFile);
    const product = JSON.parse(fs.readFileSync(productPath, 'utf-8'));

    if (!product._new_folder) continue;

    const folders = [product._new_folder, ...(product._extra_folders || [])];
    const allFiles = [];
    for (const folder of folders) {
      const src = path.join(SRC_DIR, folder);
      const files = listImages(src);
      for (const f of files) {
        allFiles.push(path.join(src, f));
      }
    }

    const slug = product.id || productFile.replace('.json', '');

    if (!allFiles.length) {
      console.log(`⚠️  ${slug}: в папках ${folders.join(', ')} не найдено фото — пропускаю`);
      totalSkipped++;
      continue;
    }

    console.log(`\n📦 ${slug} (${product.name_ru}) — ${allFiles.length} фото из ${folders.join(', ')}`);

    const newImageNames = [];
    for (let i = 0; i < allFiles.length; i++) {
      const srcPath = allFiles[i];
      const suffix = i === 0 ? '' : `-${i + 1}`;
      const dstName = `${slug}${suffix}.webp`;
      const dstPath = path.join(DST_DIR, dstName);
      const ok = await processImage(srcPath, dstPath);
      if (ok) {
        newImageNames.push(`/images/products/${dstName}`);
        console.log(`  ✓ ${path.basename(srcPath)} → ${dstName}`);
      }
    }

    if (newImageNames.length) {
      product.images = newImageNames;
      totalProcessed++;
    }

    delete product._new_folder;
    delete product._extra_folders;

    // Сохраняем обновлённый файл товара
    fs.writeFileSync(productPath, JSON.stringify(product, null, 2), 'utf-8');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Обработано: ${totalProcessed} товаров, пропущено: ${totalSkipped}`);

  // Пересобираем products.json
  console.log('\n🔨 Пересобираю products.json...');
  try {
    execSync('node build-content.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Ошибка при сборке products.json:', e.message);
  }

  console.log('\n👉 Дальше:');
  console.log('   1. Открой GitHub Desktop');
  console.log('   2. Увидишь кучу изменений (новые фото + обновлённые JSON)');
  console.log('   3. Commit message: "Обновление фото товаров"');
  console.log('   4. Commit to main → Push origin');
  console.log('   5. Через минуту сайт обновится');
})();
