// ============================================
// Hero-видео: запуск по нажатию, крупная кнопка Play и управление звуком
// ============================================
(function () {
  const videos = document.querySelectorAll('.hero-video');
  if (!videos.length) return;

  // При уходе с экрана ставим на паузу. Прокрутка не запускает видео.
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const v = entry.target.querySelector('video');
          if (v && !entry.isIntersecting) v.pause();
        });
      }, { threshold: 0 })
    : null;

  videos.forEach((wrapper) => {
    const video = wrapper.querySelector('video');
    if (!video) return;
    const bigPlayBtn = wrapper.querySelector('.video-big-play');

    // Отключаем автозапуск, в том числе если сохранилась старая HTML-разметка.
    video.autoplay = false;
    video.removeAttribute('autoplay');
    video.pause();

    // touch-устройства — показываем контролы после тапа
    wrapper.addEventListener('touchstart', () => {
      wrapper.classList.add('touched');
    }, { passive: true });

    // Play/Pause
    const playBtn = wrapper.querySelector('.video-play');
    const iconPlay = wrapper.querySelector('.icon-play');
    const iconPause = wrapper.querySelector('.icon-pause');

    function updatePlayIcon() {
      const isPlaying = !video.paused && !video.ended;
      iconPlay.style.display = isPlaying ? 'none' : '';
      iconPause.style.display = isPlaying ? '' : 'none';
      playBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести видео');

      if (bigPlayBtn) {
        if (isPlaying && document.activeElement === bigPlayBtn) {
          playBtn.focus({ preventScroll: true });
        }
        bigPlayBtn.hidden = isPlaying;
      }
    }

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused || video.ended) {
        delete video.dataset.userPaused;
        video.play().catch(() => updatePlayIcon());
      } else {
        video.dataset.userPaused = '1';
        video.pause();
      }
    });
    video.addEventListener('play', updatePlayIcon);
    video.addEventListener('pause', updatePlayIcon);
    video.addEventListener('ended', updatePlayIcon);

    if (bigPlayBtn) {
      bigPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playBtn.click();
      });
    }

    // Клик по видео = play/pause
    video.addEventListener('click', () => {
      playBtn.click();
    });

    // Звук — при включении звука на одном, на остальных выключаем
    const soundBtn = wrapper.querySelector('.video-sound');
    const iconMuted = wrapper.querySelector('.icon-muted');
    const iconSound = wrapper.querySelector('.icon-sound');

    function updateSoundIcon() {
      if (video.muted) {
        iconMuted.style.display = '';
        iconSound.style.display = 'none';
      } else {
        iconMuted.style.display = 'none';
        iconSound.style.display = '';
      }
    }

    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.muted) {
        // включить звук тут, отключить у всех остальных
        videos.forEach(w => {
          const v = w.querySelector('video');
          if (v && v !== video) {
            v.muted = true;
            const others = {
              muted: w.querySelector('.icon-muted'),
              sound: w.querySelector('.icon-sound'),
            };
            if (others.muted) others.muted.style.display = '';
            if (others.sound) others.sound.style.display = 'none';
          }
        });
        video.muted = false;
      } else {
        video.muted = true;
      }
      updateSoundIcon();
    });

    // начальные иконки
    updatePlayIcon();
    updateSoundIcon();

    // наблюдаем
    if (io) io.observe(wrapper);
  });
})();

