#!/usr/bin/env python3
"""
Умная миграция фото из content/products_new/<slug>/ в images/products/.

ОТЛИЧИЯ ОТ СТАРОГО СКРИПТА:
- Не требует поле _new_folder в JSON-файлах товаров
- Сам сканирует content/products_new/ и матчит подпапки с товарами по slug
- Берёт ВСЕ фото из подпапки (а не только первое)
- Поддерживает HEIC (айфоновский формат) — нужна доп. библиотека pillow-heif
- Можно запускать повторно — просто пересинхронизирует
- Игнорирует accessories/ и equipment/ (по запросу пользователя)

Запуск:
    cd ~/Documents/GitHub/xpodium-russia
    python3 migrate-photos-v2.py
"""

import json
import os
import sys
import subprocess
from pathlib import Path

# --- Установка зависимостей ---
def ensure_package(pkg_name, import_name=None):
    import_name = import_name or pkg_name
    try:
        __import__(import_name)
    except ImportError:
        print(f"📦 Устанавливаю {pkg_name}...")
        attempts = [
            [sys.executable, "-m", "pip", "install", "--user", pkg_name],
            [sys.executable, "-m", "pip", "install", "--user", "--break-system-packages", pkg_name],
            [sys.executable, "-m", "pip", "install", pkg_name],
        ]
        for cmd in attempts:
            try:
                subprocess.check_call(cmd, stderr=subprocess.DEVNULL)
                return
            except subprocess.CalledProcessError:
                continue
        print(f"❌ Не удалось установить {pkg_name}")
        sys.exit(1)

ensure_package("Pillow", "PIL")
# HEIC поддержка — опционально (для айфоновских фото)
try:
    ensure_package("pillow-heif", "pillow_heif")
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_OK = True
except Exception:
    HEIC_OK = False
    print("⚠️  Поддержка HEIC недоступна — HEIC-файлы будут пропущены")

from PIL import Image, ImageOps

# --- Пути ---
ROOT = Path(__file__).resolve().parent
SRC_DIR = ROOT / "content" / "products_new"
PRODUCTS_DIR = ROOT / "content" / "products"
DST_DIR = ROOT / "images" / "products"

# Папки которые игнорируем (по запросу пользователя)
IGNORE_FOLDERS = {"accessories", "equipment"}

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def slugify(name: str) -> str:
    """Нормализует имя папки в slug (для матчинга со slug товара)."""
    return name.lower().replace(" ", "-").replace(".", "-").replace(":", "-").replace("_", "-")


def list_images(folder: Path):
    """Список изображений в папке, отсортированных по имени."""
    if not folder.exists() or not folder.is_dir():
        return []
    files = []
    for f in folder.iterdir():
        if not f.is_file():
            continue
        if f.name.startswith("."):
            continue
        if f.suffix.lower() not in IMG_EXTS:
            continue
        files.append(f)
    return sorted(files, key=lambda p: p.name.lower())


def process_image(src: Path, dst: Path) -> bool:
    """Сжимает изображение в WebP 1000px по длинной стороне."""
    try:
        with Image.open(src) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "LA"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[-1])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            img.thumbnail((1000, 1000), Image.LANCZOS)
            img.save(dst, "WEBP", quality=85, method=6)
        return True
    except Exception as e:
        print(f"  ✗ Ошибка при обработке {src.name}: {e}")
        return False


def main():
    if not PRODUCTS_DIR.exists():
        print(f"❌ Не найдена папка {PRODUCTS_DIR}")
        print("   Запусти скрипт из корня репозитория xpodium-russia")
        sys.exit(1)

    if not SRC_DIR.exists():
        print(f"❌ Не найдена папка {SRC_DIR}")
        print("   Положи фото в content/products_new/<slug>/")
        sys.exit(1)

    DST_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Собираем все товары
    products = {}  # slug -> (path, data)
    for product_path in sorted(PRODUCTS_DIR.glob("*.json")):
        with product_path.open(encoding="utf-8") as f:
            data = json.load(f)
        slug = data.get("id", product_path.stem)
        products[slug] = (product_path, data)

    print(f"📦 Найдено товаров: {len(products)}")

    # 2. Собираем все папки в products_new/
    src_folders = {}  # имя папки -> Path
    for folder in SRC_DIR.iterdir():
        if not folder.is_dir():
            continue
        if folder.name.startswith("."):
            continue
        if folder.name in IGNORE_FOLDERS:
            print(f"⏭️  Пропускаю папку: {folder.name}")
            continue
        src_folders[folder.name] = folder

    print(f"📂 Найдено папок с фото: {len(src_folders)}")

    # 3. Матчим папки с товарами
    # Точное совпадение по slug, либо по slugify(имя_папки)
    matches = {}  # slug товара -> [Path фото]
    used_folders = set()
    unmatched_folders = []

    for folder_name, folder in src_folders.items():
        # Пробуем найти товар: по точному имени, по slugify, по приведению точек/двоеточий
        candidates = [
            folder_name,
            slugify(folder_name),
            folder_name.replace(":", "-").replace(".", "-"),
            folder_name.replace(" ", "-").replace(".", "-").replace(":", "-"),
        ]
        matched_slug = None
        for c in candidates:
            if c in products:
                matched_slug = c
                break
        if matched_slug:
            images = list_images(folder)
            if images:
                matches[matched_slug] = images
                used_folders.add(folder_name)
        else:
            unmatched_folders.append(folder_name)

    if unmatched_folders:
        print(f"\n⚠️  Папки которые не сматчены с товарами ({len(unmatched_folders)}):")
        for fn in unmatched_folders:
            print(f"   - {fn}")
        print("   (проверь имена — они должны совпадать со slug товара)")

    # 4. Обрабатываем фото
    total_processed = 0
    total_photos = 0

    for slug, photo_paths in matches.items():
        product_path, product = products[slug]

        # Удаляем старые фото этого товара (slug.webp, slug-2.webp, slug-N.webp)
        # Чтобы при повторном запуске не оставались битые
        for f in DST_DIR.iterdir():
            if not f.is_file():
                continue
            name = f.name
            if name == f"{slug}.webp":
                f.unlink()
            elif name.startswith(f"{slug}-") and name.endswith(".webp"):
                # проверяем что между - и .webp только цифры
                middle = name[len(slug) + 1:-5]
                if middle.isdigit():
                    f.unlink()

        new_image_paths = []
        for i, src in enumerate(photo_paths):
            suffix = "" if i == 0 else f"-{i + 1}"
            dst_name = f"{slug}{suffix}.webp"
            dst = DST_DIR / dst_name
            if process_image(src, dst):
                new_image_paths.append(f"/images/products/{dst_name}")
                total_photos += 1

        if new_image_paths:
            product["images"] = new_image_paths
            # Чистим временные поля если есть
            product.pop("_new_folder", None)
            product.pop("_extra_folders", None)

            product_path.write_text(
                json.dumps(product, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"✓ {slug}: {len(new_image_paths)} фото")
            total_processed += 1

    print("\n" + "━" * 50)
    print(f"✅ Обработано товаров: {total_processed}")
    print(f"   Всего фото пересжато: {total_photos}")
    print(f"   Папок не сматчено: {len(unmatched_folders)}")

    # Пересборка products.json
    build_script = ROOT / "build-content.js"
    if build_script.exists():
        print("\n🔨 Пересобираю products.json...")
        try:
            subprocess.run(["node", str(build_script)], cwd=ROOT, check=True)
        except FileNotFoundError:
            print("   (node не установлен — products.json пересоберётся на Netlify)")
        except subprocess.CalledProcessError as e:
            print(f"   Ошибка: {e}")

    print("\n👉 Дальше:")
    print("   1. Открой GitHub Desktop")
    print('   2. Commit message: "Все фото товаров с галереей"')
    print("   3. Commit to main → Push origin")
    print("   4. Через 1-2 минуты проверь сайт")


if __name__ == "__main__":
    main()
