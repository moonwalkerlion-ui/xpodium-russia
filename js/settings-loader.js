/* ============================================
   Загрузка настроек сайта из settings.json
   и подстановка в DOM через data-атрибуты
   ============================================ */

let SETTINGS = null;

async function loadSettings() {
  if (SETTINGS) return SETTINGS;
  try {
    const res = await fetch('settings.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('not ok');
    SETTINGS = await res.json();
  } catch (e) {
    console.warn('settings.json не загружен, использую значения из HTML');
    SETTINGS = {};
  }
  applySettings();
  return SETTINGS;
}

function applySettings() {
  // Бегущая строка (marquee) — собираем из массива messages
  if (SETTINGS.marquee && Array.isArray(SETTINGS.marquee.messages) && SETTINGS.marquee.messages.length) {
    const msgs = SETTINGS.marquee.messages.map(m => m.text).filter(Boolean);
    if (msgs.length) {
      // Повторяем дважды для плавной прокрутки
      const html = [...msgs, ...msgs, ...msgs].map(t =>
        `<span>${escapeHtml(t)}</span><span>•</span>`
      ).join('');
      document.querySelectorAll('.marquee-track').forEach(track => {
        track.innerHTML = html;
      });
    }
  }

  // Контакты (ссылки на Telegram, Instagram)
  if (SETTINGS.contacts) {
    const { telegram, order_telegram, instagram, email, phone } = SETTINGS.contacts;

    if (telegram) {
      const tgUrl = `https://t.me/${telegram}`;
      document.querySelectorAll('a[href*="t.me/"]').forEach(a => {
        a.href = tgUrl;
      });
      // также обновим текст где @username
      document.querySelectorAll('[data-contact="telegram-handle"]').forEach(el => {
        el.textContent = `@${telegram}`;
      });
      // обновим глобальный конфиг корзины (если уже инициализирован app.js)
      if (typeof SHOP_CONFIG !== 'undefined') {
        SHOP_CONFIG.telegram = telegram;
        SHOP_CONFIG.telegramUrl = tgUrl;
      }
    }
    // Отдельный ник для приёма заказов (личный TG, не канал)
    // Если указан — все заказы идут на него, не на общий telegram
    if (typeof SHOP_CONFIG !== 'undefined') {
      const orderHandle = order_telegram || telegram;
      if (orderHandle) {
        SHOP_CONFIG.orderTelegram = orderHandle;
        SHOP_CONFIG.orderTelegramUrl = `https://t.me/${orderHandle}`;
      }
    }
    if (instagram) {
      document.querySelectorAll('a[href*="instagram.com/"]').forEach(a => {
        a.href = `https://instagram.com/${instagram}`;
      });
      document.querySelectorAll('[data-contact="instagram-handle"]').forEach(el => {
        el.textContent = `@${instagram}`;
      });
    }
    if (email) {
      document.querySelectorAll('[data-contact="email"]').forEach(el => {
        el.textContent = email;
        if (el.tagName === 'A') el.href = `mailto:${email}`;
      });
    }
    if (phone) {
      document.querySelectorAll('[data-contact="phone"]').forEach(el => {
        el.textContent = phone;
        if (el.tagName === 'A') el.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
      });
    }
  }

  // Главная
  if (SETTINGS.home) {
    const h = SETTINGS.home;

    // Hero: собираем заголовок из строк 1 и 2 (если есть hero_title_block — он приоритетнее)
    if (h.hero_title_block !== undefined) {
      const blockEl = document.querySelector('[data-setting="hero_title_block"]');
      if (blockEl) blockEl.innerHTML = h.hero_title_block || '';
    } else if (h.hero_title_1 || h.hero_title_2) {
      const blockEl = document.querySelector('[data-setting="hero_title_block"]');
      if (blockEl) {
        const parts = [h.hero_title_1, h.hero_title_2].filter(Boolean);
        blockEl.innerHTML = parts.map(escapeHtml).join('<br>');
      }
    }

    // Размер шрифта hero (vw)
    if (typeof h.hero_title_size === 'number' && h.hero_title_size > 0) {
      const blockEl = document.querySelector('[data-setting="hero_title_block"]');
      if (blockEl) {
        blockEl.style.fontSize = `${h.hero_title_size}vw`;
      }
    }

    setText('[data-setting="hero_subtitle"]', h.hero_subtitle);
    setText('[data-setting="hero_cta"]', h.hero_cta);
    setText('[data-setting="about_title"]', h.about_title);
    setText('[data-setting="about_text"]', h.about_text);

    // CTA в нижней части главной
    setText('[data-setting="cta_title"]', h.cta_title);
    setText('[data-setting="cta_subtitle"]', h.cta_subtitle);
    setText('[data-setting="cta_button"]', h.cta_button);

    // Hero фоновое изображение
    if (h.hero_image) {
      const heroBg = document.querySelector('.hero-bg');
      if (heroBg) {
        heroBg.style.setProperty('--hero-bg-image', `url("${h.hero_image}")`);
        heroBg.setAttribute('data-has-image', 'true');
      }
    }

    // Преимущества (4 блока)
    if (Array.isArray(h.features) && h.features.length) {
      const featuresContainer = document.querySelector('[data-setting="features_list"]');
      if (featuresContainer) {
        featuresContainer.innerHTML = h.features.map(f => `
          <div class="feature">
            <div class="feature-icon">${escapeHtml(f.icon || '◆')}</div>
            <div class="feature-title">${escapeHtml(f.title || '')}</div>
            <div class="feature-text">${escapeHtml(f.text || '')}</div>
          </div>
        `).join('');
      }
    }
  }

  // Футер
  if (SETTINGS.footer) {
    const f = SETTINGS.footer;
    setText('[data-setting="footer_tagline"]', f.tagline);
    setText('[data-setting="footer_copyright"]', f.copyright);
    setText('[data-setting="footer_right_text"]', f.right_text);
  }

  // Логотип / название бренда
  if (SETTINGS.brand && SETTINGS.brand.name) {
    setText('[data-setting="site_brand"]', SETTINGS.brand.name);
    document.title = document.title.replace(/^[^—|–-]+/, SETTINGS.brand.name + ' ');
  }

  // Категории на главной
  if (SETTINGS.categories && Array.isArray(SETTINGS.categories.items)) {
    SETTINGS.categories.items.forEach(cat => {
      // Карточка категории на главной (.cat-card)
      const card = document.querySelector(`.cat-card[data-cat="${cat.id}"]`);
      if (card) {
        // Название
        const labelEl = card.querySelector('.cat-label');
        if (labelEl && cat.label) labelEl.textContent = cat.label;
        // Фоновое фото
        const imgEl = card.querySelector('.cat-img');
        if (imgEl && cat.image) imgEl.style.backgroundImage = `url('${cat.image}')`;
        // Если категория скрыта — добавляем стиль и блокируем переход
        if (cat.hidden) {
          card.classList.add('cat-card-hidden');
          card.setAttribute('href', 'javascript:void(0)');
          card.style.pointerEvents = 'none';
          // Добавляем плашку "TO BE ANNOUNCED"
          if (!card.querySelector('.cat-placeholder')) {
            const ph = document.createElement('div');
            ph.className = 'cat-placeholder';
            ph.textContent = cat.placeholder || 'TO BE ANNOUNCED';
            card.appendChild(ph);
          }
        }
      }
      // Также обновляем названия в навигации (выпадающее меню каталога)
      document.querySelectorAll(`a[href*="cat=${cat.id}"]`).forEach(a => {
        // Если внутри ссылки нет картинки — это пункт меню, обновляем текст
        if (!a.querySelector('img') && !a.classList.contains('cat-card') && cat.label) {
          a.textContent = cat.label;
        }
      });
    });

    // Глобальная защита: если пользователь зашёл напрямую на shop.html?cat=equipment, и она скрыта — редирект на каталог
    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('cat');
    if (currentCat) {
      const matched = SETTINGS.categories.items.find(c => c.id === currentCat);
      if (matched && matched.hidden) {
        // Показываем плашку вместо товаров
        document.body.setAttribute('data-cat-hidden', 'true');
        const ph = matched.placeholder || 'TO BE ANNOUNCED';
        // Экранируем кавычки для CSS-строки
        const safe = ph.replace(/"/g, '\\"');
        document.body.style.setProperty('--cat-placeholder', `"${safe}"`);
      }
    }
  }

  // Our Story
  if (SETTINGS.story) {
    const s = SETTINGS.story;
    setText('[data-setting="story_title_1"]', s.title_1);
    setText('[data-setting="story_title_2"]', s.title_2);
    setText('[data-setting="story_subtitle"]', s.subtitle);
    // body как markdown — просто разбиваем на абзацы
    if (s.body) {
      const bodyEl = document.querySelector('[data-setting="story_body"]');
      if (bodyEl) {
        const paragraphs = s.body.split(/\n\s*\n/).filter(p => p.trim());
        bodyEl.innerHTML = paragraphs.map((p, i) =>
          `<p${i === 0 ? ' class="lead"' : ''}>${escapeHtml(p.trim())}</p>`
        ).join('');
      }
    }
  }

  // Доставка / оплата / возврат
  if (SETTINGS.delivery) {
    const d = SETTINGS.delivery;
    renderList('[data-setting="delivery_list"]', d.delivery);
    renderList('[data-setting="payment_list"]', d.payment);
    renderList('[data-setting="returns_list"]', d.returns);
    if (typeof d.free_shipping_from === 'number' && typeof SHOP_CONFIG !== 'undefined') {
      SHOP_CONFIG.freeShippingFrom = d.free_shipping_from;
    }
  }
}

function setText(selector, value) {
  if (!value) return;
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = value;
  });
}

function renderList(selector, items) {
  if (!Array.isArray(items) || !items.length) return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = items.map(it => {
    const text = typeof it === 'object' && it !== null ? it.text : it;
    return `<li>${escapeHtml(text)}</li>`;
  }).join('');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Запускаем сразу при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings);
} else {
  loadSettings();
}
