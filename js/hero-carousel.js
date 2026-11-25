// Главная использует те же условия акции, что и каталог с корзиной.
(async function () {
  const carousel = document.querySelector('.home-carousel');
  if (!carousel) return;

  try { await loadShopSettings(); } catch { /* Остальные предложения доступны при сбое загрузки настроек. */ }
  if (MACHINE_PROMO) {
    const gift = carousel.querySelector('.home-slide-gift');
    const { requiredQty, giftLabel } = MACHINE_PROMO;
    gift.querySelector('[data-gift-label]').textContent =
      giftLabel.charAt(0).toUpperCase() + giftLabel.slice(1);
    gift.querySelector('[data-gift-quantity]').textContent =
      requiredQty + ' кардио' + machinesWordGen(requiredQty);
    gift.hidden = false;
  }

  const slides = Array.from(carousel.querySelectorAll('.home-slide:not([hidden])'));
  const controls = carousel.querySelector('.home-carousel-controls');
  const marks = controls.querySelector('.home-carousel-marks');
  const toggle = controls.querySelector('.home-carousel-toggle');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = motion.matches;
  let timer;

  slides.forEach((slide, index) => {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.setAttribute('aria-label', slide.getAttribute('aria-label'));
    mark.setAttribute('aria-pressed', String(index === current));
    mark.addEventListener('click', () => showSlide(index));
    marks.appendChild(mark);
  });
  controls.hidden = false;

  function schedule() {
    window.clearTimeout(timer);
    if (paused || document.hidden || slides[current].contains(document.activeElement)) return;
    timer = window.setTimeout(() => showSlide((current + 1) % slides.length), 5000);
  }

  function showSlide(next) {
    if (next === current) { schedule(); return; }
    const previous = current;
    current = next;
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle('is-current', active);
      slide.classList.toggle('is-entering', active);
      slide.classList.toggle('is-leaving', index === previous);
      slide.toggleAttribute('inert', !active);
      slide.setAttribute('aria-hidden', String(!active));
      marks.children[index].setAttribute('aria-pressed', String(active));
    });
    schedule();
  }

  function setPaused(value) {
    paused = value;
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Включить смену слайдов' : 'Приостановить смену слайдов');
    schedule();
  }

  toggle.addEventListener('click', () => setPaused(!paused));
  carousel.addEventListener('focusin', schedule);
  carousel.addEventListener('focusout', () => queueMicrotask(schedule));
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', event => setPaused(event.matches));
  setPaused(paused);
})();
