#!/usr/bin/env python3
"""
Чинит products: проходит по images/products/, для каждого товара
находит все webp файлы по его slug (slug.webp, slug-2.webp, slug-3.webp...)
и записывает все пути в массив images в JSON-файле товара.

Запуск:
    python3 fix-product-images.py
"""

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRODUCTS_DIR = ROOT / "content" / "products"
IMAGES_DIR = ROOT / "images" / "products"


def find_images_for_slug(slug: str) -> list[str]:
    """Ищет все webp-файлы для товара: slug.webp, slug-2.webp, slug-3.webp..."""
    if not IMAGES_DIR.exists():
        return []

    main = IMAGES_DIR / f"{slug}.webp"
    extras = []

    # ищем slug-N.webp (N = 2, 3, ...)
    pattern = re.compile(rf"^{re.escape(slug)}-(\d+)\.webp$")
    found_extras = {}
    for f in IMAGES_DIR.iterdir():
        if not f.is_file():
            continue
        m = pattern.match(f.name)
        if m:
            n = int(m.group(1))
            found_extras[n] = f.name

    images = []
    if main.exists():
        images.append(f"/images/products/{slug}.webp")
    # добавляем по порядку
    for n in sorted(found_extras.keys()):
        images.append(f"/images/products/{found_extras[n]}")
    return images


def main():
    if not PRODUCTS_DIR.exists():
        print(f"❌ Не найдена папка {PRODUCTS_DIR}")
        return

    fixed = 0
    skipped = 0

    for product_path in sorted(PRODUCTS_DIR.glob("*.json")):
        with product_path.open(encoding="utf-8") as f:
            product = json.load(f)

        slug = product.get("id", product_path.stem)
        found_images = find_images_for_slug(slug)

        old_count = len(product.get("images", []))
        new_count = len(found_images)

        if not found_images:
            print(f"⚠️  {slug}: фото не найдены в images/products/")
            skipped += 1
            continue

        if new_count > old_count:
            product["images"] = found_images
            product_path.write_text(
                json.dumps(product, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"✓ {slug}: было {old_count} → стало {new_count} фото")
            fixed += 1
        elif new_count == old_count:
            print(f"  {slug}: {new_count} фото (без изменений)")
        else:
            # На сервере меньше файлов чем в JSON — оставляем как есть
            print(f"  {slug}: в JSON {old_count}, на диске {new_count} — оставляю JSON")

    print("\n" + "━" * 40)
    print(f"✅ Обновлено товаров: {fixed}")
    print(f"   Без изменений: {sum(1 for _ in PRODUCTS_DIR.glob('*.json')) - fixed - skipped}")
    print(f"   Пропущено (нет фото): {skipped}")
    print("\n👉 Дальше:")
    print("   1. Открой GitHub Desktop")
    print('   2. Commit message: "Связь товаров со всеми фото"')
    print("   3. Commit to main → Push origin")


if __name__ == "__main__":
    main()
