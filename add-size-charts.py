#!/usr/bin/env python3
# =========================================================
# add-size-charts.py — раскладывает таблицы размеров по карточкам товаров
#
# Запуск из корня репозитория (в Терминале на маке):
#   cd /Users/grgeeryanlevon/Documents/GitHub/xpodium-russia
#   python3 add-size-charts.py
#
# Что делает:
#   • Накладкам (grips) прописывает таблицу с длиной ладони
#   • Наколенникам прописывает таблицу с обхватом колена
#   • Поясу прописывает таблицу с обхватом талии
#   • Налокотники (elbow-sleeves-3-0) НЕ трогает — у них другой замер
#   • Если у товара таблица уже заполнена вручную — не перезаписывает
#
# После запуска: закоммить изменения через GitHub Desktop.
# Дальше правишь таблицы в админке, скрипт больше не нужен — можно удалить.
# =========================================================

import json
import os
import sys

PRODUCTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content', 'products')

# Товары, которым таблицу НЕ прописываем (свой замер / нет данных)
SKIP_IDS = {
    'elbow-sleeves-3-0',   # Налокотники — меряется предплечье, а не колено
}

CHART_GRIPS = {
    'enabled': True,
    'col_1_label': 'Длина ладони',
    'col_2_label': 'Длина рабочей поверхности',
    'rows': [
        {'size': 'M', 'value_1': 'до 10 см', 'value_2': '13,5 см'},
        {'size': 'L', 'value_1': 'от 10 см', 'value_2': '14,5 см'},
    ],
    'note': 'Измерьте длину ладони от основания пальцев до запястья. По размерам S и XL уточните у менеджера.',
}

CHART_KNEE = {
    'enabled': True,
    'col_1_label': 'Обхват колена',
    'col_2_label': '',
    'rows': [
        {'size': 'XS', 'value_1': '31–33 см', 'value_2': ''},
        {'size': 'S',  'value_1': '33–35 см', 'value_2': ''},
        {'size': 'M',  'value_1': '35–37 см', 'value_2': ''},
        {'size': 'L',  'value_1': '37–40 см', 'value_2': ''},
        {'size': 'XL', 'value_1': '40–43 см', 'value_2': ''},
    ],
    'note': 'Измерьте обхват ноги по центру колена.',
}

CHART_BELT = {
    'enabled': True,
    'col_1_label': 'Обхват талии',
    'col_2_label': '',
    'rows': [
        {'size': 'XS', 'value_1': 'до 73 см', 'value_2': ''},
        {'size': 'S',  'value_1': '73–80 см', 'value_2': ''},
        {'size': 'M',  'value_1': '80–87 см', 'value_2': ''},
        {'size': 'L',  'value_1': '87–93 см', 'value_2': ''},
        {'size': 'XL', 'value_1': '93–99 см', 'value_2': ''},
    ],
    'note': 'Измерьте обхват талии и выберите соответствующий размер. Ширина пояса — 10,5 см.',
}

BY_SUBCATEGORY = {
    'grips': CHART_GRIPS,
    'sleeves': CHART_KNEE,
    'belts': CHART_BELT,
}

if not os.path.isdir(PRODUCTS_DIR):
    print(f'✗ Не найдена папка {PRODUCTS_DIR}')
    print('  Запусти скрипт из корня репозитория (там где лежит папка content/)')
    sys.exit(1)

files = sorted(f for f in os.listdir(PRODUCTS_DIR) if f.endswith('.json'))
print(f'Найдено товаров: {len(files)}\n')

added = 0
skipped_existing = 0
skipped_manual = []

for filename in files:
    path = os.path.join(PRODUCTS_DIR, filename)
    try:
        with open(path, encoding='utf-8') as f:
            product = json.load(f)
    except Exception as e:
        print(f'  ✗ Ошибка чтения {filename}: {e}')
        continue

    product_id = product.get('id') or filename[:-5]
    subcategory = product.get('subcategory')

    if product_id in SKIP_IDS:
        skipped_manual.append(product.get('name_ru') or product_id)
        continue

    chart = BY_SUBCATEGORY.get(subcategory)
    if not chart:
        continue

    # Не перезаписываем то, что уже заполнено руками в админке
    existing = product.get('size_chart')
    if isinstance(existing, dict) and existing.get('rows'):
        skipped_existing += 1
        continue

    product['size_chart'] = json.loads(json.dumps(chart))  # копия

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(product, f, ensure_ascii=False, indent=2)
        f.write('\n')

    added += 1
    print(f'  ✓ {product.get("name_ru", product_id)} → таблица «{chart["col_1_label"]}»')

print('\n=========================================')
print(f'Таблиц добавлено: {added}')
if skipped_existing:
    print(f'Пропущено (таблица уже была): {skipped_existing}')
if skipped_manual:
    print('Намеренно без таблицы:')
    for n in skipped_manual:
        print(f'  • {n}')
print('\nГотово. Открой GitHub Desktop, проверь изменения, закоммить.')
