#!/usr/bin/env python3
"""
Перенос фото из content/products_new/ в images/products/
Python-версия (без Node.js).

Запуск (из корня репозитория):
    python3 migrate-photos.py

При первом запуске установит библиотеку Pillow автоматически.
"""

import json
import os
import sys
import subprocess
from pathlib import Path

# Ставим Pillow если его нет
try:
    from PIL import Image, ImageOps
except ImportError:
    print("📦 Устанавливаю библиотеку Pillow для обработки картинок...")
    # Пробуем разные варианты установки (зависит от версии Python / ОС)
    install_attempts = [
        [sys.executable, "-m", "pip", "install", "--user", "Pillow"],
        [sys.executable, "-m", "pip", "install", "--user", "--break-system-packages", "Pillow"],
        [sys.executable, "-m", "pip", "install", "Pillow"],
    ]
    installed = False
    for cmd in install_attempts:
        try:
            subprocess.check_call(cmd, stderr=subprocess.DEVNULL)
            installed = True
            break
        except subprocess.CalledProcessError:
            continue
    if not installed:
        print("❌ Не удалось установить Pillow автоматически.")
        print("   Попробуй вручную в терминале:")
        print(f"   {sys.executable} -m pip install --user Pillow")
        sys.exit(1)
    from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
SRC_DIR = ROOT / "content" / "products_new"
PRODUCTS_DIR = ROOT / "content" / "products"
DST_DIR = ROOT / "images" / "products"

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def list_images(folder: Path):
    """Возвращает список изображений в папке, отсортированных по имени."""
    if not folder.exists():
        return []
    files = [
        f for f in folder.iterdir()
        if f.is_file()
        and f.suffix.lower() in IMG_EXTS
        and not f.name.startswith(".")
    ]
    return sorted(files, key=lambda p: p.name)


def process_image(src: Path, dst: Path) -> bool:
    """Сжимает изображение в WebP 1000px максимум по длинной стороне."""
    try:
        with Image.open(src) as img:
            # поворот по EXIF
            img = ImageOps.exif_transpose(img)
            # конвертация в RGB (webp не любит палитровые режимы со сложной прозрачностью)
            if img.mode in ("RGBA", "LA"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[-1])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            # ресайз
            img.thumbnail((1000, 1000), Image.LANCZOS)
            # сохранение
            img.save(dst, "WEBP", quality=85, method=6)
        return True
    except Exception as e:
        print(f"  ✗ Ошибка при обработке {src.name}: {e}")
        return False


def main():
    print("🔍 Читаю файлы товаров из content/products/...")

    if not PRODUCTS_DIR.exists():
        print(f"❌ Не найдена папка {PRODUCTS_DIR}")
        print("   Убедись что ты запустил скрипт из корня репозитория xpodium-russia")
        sys.exit(1)

    DST_DIR.mkdir(parents=True, exist_ok=True)

    product_files = sorted(PRODUCTS_DIR.glob("*.json"))
    total_processed = 0
    total_skipped = 0

    for product_path in product_files:
        with product_path.open(encoding="utf-8") as f:
            product = json.load(f)

        if "_new_folder" not in product:
            continue

        folders = [product["_new_folder"]] + product.get("_extra_folders", [])
        all_files = []
        for folder_name in folders:
            folder = SRC_DIR / folder_name
            all_files.extend(list_images(folder))

        slug = product.get("id", product_path.stem)
        name_ru = product.get("name_ru", "")

        if not all_files:
            print(f"⚠️  {slug}: в папках {folders} не найдено фото — пропускаю")
            total_skipped += 1
            # Всё равно убираем временные поля
            product.pop("_new_folder", None)
            product.pop("_extra_folders", None)
            product_path.write_text(
                json.dumps(product, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            continue

        print(f"\n📦 {slug} ({name_ru}) — {len(all_files)} фото из {', '.join(folders)}")

        new_image_paths = []
        for i, src in enumerate(all_files):
            suffix = "" if i == 0 else f"-{i + 1}"
            dst_name = f"{slug}{suffix}.webp"
            dst = DST_DIR / dst_name
            if process_image(src, dst):
                new_image_paths.append(f"/images/products/{dst_name}")
                print(f"  ✓ {src.name} → {dst_name}")

        if new_image_paths:
            product["images"] = new_image_paths
            total_processed += 1

        # Убираем временные поля
        product.pop("_new_folder", None)
        product.pop("_extra_folders", None)

        product_path.write_text(
            json.dumps(product, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    print("\n" + "━" * 40)
    print(f"✅ Обработано: {total_processed} товаров, пропущено: {total_skipped}")

    # Пересобираем products.json
    build_script = ROOT / "build-content.js"
    if build_script.exists():
        print("\n🔨 Пересобираю products.json...")
        try:
            subprocess.run(["node", str(build_script)], cwd=ROOT, check=True)
        except FileNotFoundError:
            # node нет — это ок, products.json всё равно обновится при деплое на Netlify
            print("   (node не установлен — products.json пересоберётся автоматически на Netlify)")
        except subprocess.CalledProcessError as e:
            print(f"   Ошибка: {e}")

    print("\n👉 Дальше:")
    print("   1. Открой GitHub Desktop — увидишь кучу изменений")
    print('   2. Commit message: "Обновление фото товаров"')
    print("   3. Commit to main → Push origin")
    print("   4. Через минуту сайт обновится")


if __name__ == "__main__":
    main()
