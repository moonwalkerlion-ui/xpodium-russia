#!/usr/bin/env python3
# =========================================================
# update-sizes.py — bulk-обновление товаров
# Запусти из корня проекта на маке:
#   1) Открой Терминал (Cmd+Space → "Терминал")
#   2) cd ~/путь/к/папке/xpodium-russia
#   3) python3 update-sizes.py
#   4) Закоммить изменения через GitHub Desktop
# =========================================================

import json
import os
import re
import sys

PRODUCTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content', 'products')

# ID унисекс-товаров с УНИФИКАЦИЕЙ размеров до M, L, XL, XXL
UNISEX_UNIFY_SIZES = [
    'basic-logo-hoodie',   # Худи Basic Logo
    'light-fit-t-shirt',   # Футболка Light-fit
    'long-pants',          # Спортивные брюки (бывш. Штаны длинные)
]

# ID унисекс-товаров БЕЗ изменения размеров (только пометка)
UNISEX_KEEP_SIZES = [
    'hoodie',                  # Худи
    '3-4-sleeves-t-shirt',     # Футболка с рукавом 3/4 (унисекс)
    'basic-logo-socks',        # Носки basic logo
    'lifting-socks',           # Носки lifting
    'weightlifting-socks',     # Носки weightlifting
]

ALL_UNISEX = UNISEX_UNIFY_SIZES + UNISEX_KEEP_SIZES
UNIFIED_SIZES = ['M', 'L', 'XL', 'XXL']


def get_sizes_as_strings(sizes):
    """Размеры могут быть массивом строк или массивом объектов {size: "XS"}."""
    if not isinstance(sizes, list):
        return []
    result = []
    for s in sizes:
        if isinstance(s, dict):
            result.append(s.get('size', ''))
        else:
            result.append(str(s))
    return [s for s in result if s]


def set_sizes(product, sizes_array):
    """Сохраняем в том же формате что был."""
    was_objects = (
        isinstance(product.get('sizes'), list)
        and len(product['sizes']) > 0
        and isinstance(product['sizes'][0], dict)
    )
    if was_objects:
        product['sizes'] = [{'size': s} for s in sizes_array]
    else:
        product['sizes'] = list(sizes_array)


if not os.path.isdir(PRODUCTS_DIR):
    print(f'✗ Не найдена папка {PRODUCTS_DIR}')
    print('  Запусти скрипт из корня репозитория (где лежит content/)')
    sys.exit(1)

all_files = sorted([f for f in os.listdir(PRODUCTS_DIR) if f.endswith('.json')])
print(f'Найдено товаров: {len(all_files)}\n')

stats = {
    'unisex_marked': 0,
    'unisex_sizes_unified': 0,
    'men_xxl_added': 0,
    'grips_xl_added': 0,
    'skipped_men_no_xl': [],
}

for filename in all_files:
    filepath = os.path.join(PRODUCTS_DIR, filename)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            product = json.load(f)
    except Exception as e:
        print(f'  ✗ Ошибка парсинга {filename}: {e}')
        continue

    product_id = product.get('id') or filename.replace('.json', '')
    changed = False
    messages = []

    # 1. Помечаем унисекс
    if product_id in ALL_UNISEX:
        if not product.get('unisex'):
            product['unisex'] = True
            changed = True
            messages.append('помечен унисекс')
            stats['unisex_marked'] += 1
        # Унифицируем размеры
        if product_id in UNISEX_UNIFY_SIZES:
            current = get_sizes_as_strings(product.get('sizes'))
            if current != UNIFIED_SIZES:
                set_sizes(product, UNIFIED_SIZES)
                changed = True
                messages.append(f'размеры: [{", ".join(current)}] → [{", ".join(UNIFIED_SIZES)}]')
                stats['unisex_sizes_unified'] += 1

    # 2. Мужская одежда — добавить XXL если есть XL и нет XXL
    if product.get('subcategory') == 'apparel-men' and product_id not in ALL_UNISEX:
        current = get_sizes_as_strings(product.get('sizes'))
        has_xl = any(s.upper() == 'XL' for s in current)
        has_xxl = any(
            s.upper() == 'XXL' or s.upper() == '2XL' or re.search(r'2.*EXTRA.*LARGE', s.upper())
            for s in current
        )
        if has_xl and not has_xxl:
            set_sizes(product, current + ['XXL'])
            changed = True
            messages.append(f'+XXL (было: {", ".join(current)})')
            stats['men_xxl_added'] += 1
        elif not has_xl:
            stats['skipped_men_no_xl'].append(product.get('name_ru') or product_id)

    # 3. Накладки — добавить XL если нет
    if product.get('subcategory') == 'grips':
        current = get_sizes_as_strings(product.get('sizes'))
        has_xl = any(s.upper() == 'XL' for s in current)
        if not has_xl:
            set_sizes(product, current + ['XL'])
            changed = True
            messages.append(f'+XL (было: {", ".join(current)})')
            stats['grips_xl_added'] += 1

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(product, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'  ✓ {product.get("name_ru", product_id)}')
        for m in messages:
            print(f'      → {m}')

print('\n=========================================')
print('РЕЗУЛЬТАТ:')
print(f'  • Помечено унисекс: {stats["unisex_marked"]}')
print(f'  • Унисекс — размеры унифицированы: {stats["unisex_sizes_unified"]}')
print(f'  • Мужским добавлен XXL: {stats["men_xxl_added"]}')
print(f'  • Накладкам добавлен XL: {stats["grips_xl_added"]}')

if stats['skipped_men_no_xl']:
    print('\n  Не тронуто (нет размера XL в мужской одежде):')
    for n in stats['skipped_men_no_xl']:
        print(f'    • {n}')

print('\nГотово. Открой GitHub Desktop, проверь изменения, закоммить.')
