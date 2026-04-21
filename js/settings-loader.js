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
    const { telegram, instagram, email, phone } = SETTINGS.contacts;

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
    setText('[data-setting="hero_title_1"]', h.hero_title_1);
    setText('[data-setting="hero_title_2"]', h.hero_title_2);
    setText('[data-setting="hero_subtitle"]', h.hero_subtitle);
    setText('[data-setting="hero_cta"]', h.hero_cta);
    setText('[data-setting="about_title"]', h.about_title);
    setText('[data-setting="about_text"]', h.about_text);
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
