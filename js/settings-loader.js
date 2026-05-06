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
  // Бегущая строка (marquee)
  if (SETTINGS.marquee && Array.isArray(SETTINGS.marquee.messages) && SETTINGS.marquee.messages.length) {
    const msgs = SETTINGS.marquee.messages.map(m => {
      // Нормальный формат: { text: "..." }
      if (m && typeof m === 'object' && typeof m.text === 'string') return m.text;
      // Битый формат от Decap: '{"text":"..."}' (строка-JSON внутри строки)
      if (typeof m === 'string') {
        try {
          const parsed = JSON.parse(m);
          if (parsed && typeof parsed.text === 'string') return parsed.text;
        } catch (e) { /* не JSON — берём как есть */ }
        return m;
      }
      return '';
    }).filter(Boolean);
    if (msgs.length) {
      const html = [...msgs, ...msgs, ...msgs].map(t =>
        `<span>${escapeHtml(t)}</span><span>•</span>`
      ).join('');
      document.querySelectorAll('.marquee-track').forEach(track => {
        track.innerHTML = html;
      });
    }
  }

  // Контакты
  if (SETTINGS.contacts) {
    const { telegram, order_telegram, instagram, email, phone } = SETTINGS.contacts;

    if (telegram) {
      const tgUrl = `https://t.me/${telegram}`;
      document.querySelectorAll('a[href*="t.me/"]').forEach(a => {
        a.href = tgUrl;
      });
      document.querySelectorAll('[data-contact="telegram-handle"]').forEach(el => {
        el.textContent = `@${telegram}`;
      });
      if (typeof SHOP_CONFIG !== 'undefined') {
        SHOP_CONFIG.telegram = telegram;
        SHOP_CONFIG.telegramUrl = tgUrl;
      }
    }
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
    setText('[data-setting="cta_title"]', h.cta_title);
    setText('[data-setting="cta_subtitle"]', h.cta_subtitle);
    setText('[data-setting="cta_button"]', h.cta_button);

    if (h.hero_image) {
      const heroBg = document.querySelector('.hero-bg');
      if (heroBg) {
        heroBg.style.setProperty('--hero-bg-image', `url("${h.hero_image}")`);
        heroBg.setAttribute('data-has-image', 'true');
      }
    }

    // Преимущества: скрываем если выключено галочкой ИЛИ список пуст
    const featuresContainer = document.querySelector('[data-setting="features_list"]');
    if (featuresContainer) {
      const enabled = h.features_enabled !== false;
      const hasItems = Array.isArray(h.features) && h.features.length > 0;
      if (!enabled || !hasItems) {
        featuresContainer.style.display = 'none';
      } else {
        featuresContainer.style.display = '';
        featuresContainer.innerHTML = h.features.map(f => `
          <div class="feature">
            <div class="feature-icon">${escapeHtml(f.icon || '◆')}</div>
            <div class="feature-title">${escapeHtml(f.title || '')}</div>
            <div class="feature-text">${escapeHtml(f.text || '')}</div>
          </div>
        `).join('');
      }
    }

    if (h.discounts) {
      const section = document.querySelector('[data-setting="discounts_section"]');
      if (section) {
        if (h.discounts.enabled === false) {
          section.style.display = 'none';
        } else {
          section.style.display = '';
          if (h.discounts.title) setText('[data-setting="discounts_title"]', h.discounts.title);
          if (h.discounts.subtitle) setText('[data-setting="discounts_subtitle"]', h.discounts.subtitle);
          const grid = document.querySelector('[data-setting="discounts_tiers"]');
          if (grid && Array.isArray(h.discounts.tiers) && h.discounts.tiers.length) {
            grid.innerHTML = h.discounts.tiers.map(t => `
              <div class="discount-tier">
                <div class="discount-amount">от ${escapeHtml(t.amount || '')}</div>
                <div class="discount-value">−${escapeHtml(t.discount || '')}</div>
              </div>
            `).join('');
          }
        }
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
      const card = document.querySelector(`.cat-card[data-cat="${cat.id}"]`);
      if (card) {
        const labelEl = card.querySelector('.cat-label');
        if (labelEl && cat.label) labelEl.textContent = cat.label;
        const imgEl = card.querySelector('.cat-img');
        if (imgEl && cat.image) imgEl.style.backgroundImage = `url('${cat.image}')`;
        if (cat.hidden) {
          card.classList.add('cat-card-hidden');
          card.setAttribute('href', 'javascript:void(0)');
          card.style.pointerEvents = 'none';
          if (!card.querySelector('.cat-placeholder')) {
            const ph = document.createElement('div');
            ph.className = 'cat-placeholder';
            ph.textContent = cat.placeholder || 'TO BE ANNOUNCED';
            card.appendChild(ph);
          }
        }
      }
      document.querySelectorAll(`a[href*="cat=${cat.id}"]`).forEach(a => {
        if (!a.querySelector('img') && !a.classList.contains('cat-card') && cat.label) {
          a.textContent = cat.label;
        }
      });
    });

    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('cat');
    if (currentCat) {
      const matched = SETTINGS.categories.items.find(c => c.id === currentCat);
      if (matched && matched.hidden) {
        document.body.setAttribute('data-cat-hidden', 'true');
        const ph = matched.placeholder || 'TO BE ANNOUNCED';
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
    if (s.body) {
      const bodyEl = document.querySelector('[data-setting="story_body"]');
      if (bodyEl) {
        const paragraphs = s.body.split(/\n\s*\n/).filter(p => p.trim());
        bodyEl.innerHTML = paragraphs.map((p, i) =>
          `<p${i === 0 ? ' class="lead"' : ''}>${escapeHtml(p.trim())}</p>`
        ).join('');
      }
    }
    if (document.body.classList.contains('story-page')) {
      applyPageBackgrounds(s.hero_image, s.bg_image, s.title_size, s.subtitle_size);
    }
  }

  // Партнёры
  if (SETTINGS.partners) {
    const p = SETTINGS.partners;
    setText('[data-setting="partners_title"]', p.title);
    setText('[data-setting="partners_subtitle"]', p.subtitle);
    if (p.body) {
      const bodyEl = document.querySelector('[data-setting="partners_body"]');
      if (bodyEl) {
        const paragraphs = p.body.split(/\n\s*\n/).filter(x => x.trim());
        bodyEl.innerHTML = paragraphs.map((para, i) =>
          `<p${i === 0 ? ' class="lead"' : ''}>${escapeHtml(para.trim())}</p>`
        ).join('');
      }
    }
    const list = document.querySelector('.partners-tg-list');
    if (list && (p.tg_channel || p.tg_manager)) {
      const cards = [];
      if (p.tg_channel) {
        cards.push(`<a href="https://t.me/${escapeHtml(p.tg_channel)}" target="_blank" rel="noopener" class="partners-tg-card">
          <div class="partners-tg-handle">@${escapeHtml(p.tg_channel)}</div>
          <div class="partners-tg-label">${escapeHtml(p.tg_channel_label || 'Канал бренда')}</div>
        </a>`);
      }
      if (p.tg_manager) {
        cards.push(`<a href="https://t.me/${escapeHtml(p.tg_manager)}" target="_blank" rel="noopener" class="partners-tg-card">
          <div class="partners-tg-handle">@${escapeHtml(p.tg_manager)}</div>
          <div class="partners-tg-label">${escapeHtml(p.tg_manager_label || 'Менеджер по партнёрам')}</div>
        </a>`);
      }
      list.innerHTML = cards.join('');
    }
    if (document.body.classList.contains('partners-page')) {
      applyPageBackgrounds(p.hero_image, p.bg_image, p.title_size, p.subtitle_size);
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
    // Фоны на странице Контакты (хранятся в delivery.json)
    if (document.body.classList.contains('contact-page')) {
      applyPageBackgrounds(d.hero_image, d.bg_image, d.title_size, d.subtitle_size);
    }
  }
}

// Применяет фон-баннер сверху и фоновую картинку под основным контентом + размеры
function applyPageBackgrounds(heroImage, bgImage, titleSize, subtitleSize) {
  if (heroImage) {
    const heroEl = document.querySelector('.page-hero-section, .story-hero, .contact-hero, .page-hero');
    if (heroEl) {
      heroEl.classList.add('page-hero-bg');
      heroEl.style.backgroundImage = `url("${heroImage}")`;
    }
  }
  if (bgImage) {
    document.body.classList.add('has-page-bg');
    document.body.style.setProperty('--page-bg-image', `url("${bgImage}")`);
  }
  // Размер заголовка (vw)
  if (typeof titleSize === 'number' && titleSize > 0) {
    document.documentElement.style.setProperty('--page-title-size', `${titleSize}vw`);
  }
  if (typeof subtitleSize === 'number' && subtitleSize > 0) {
    document.documentElement.style.setProperty('--page-subtitle-size', `${subtitleSize}vw`);
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings);
} else {
  loadSettings();
}
