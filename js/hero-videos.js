// ============================================
// Hero-видео: автоплей при появлении, кнопки play/sound
// ============================================
(function () {
  const videos = document.querySelectorAll('.hero-video');
  if (!videos.length) return;

  // Автозапуск при попадании во viewport, пауза при уходе
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const v = entry.target.querySelector('video');
          if (!v) return;
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            if (v.paused && !v.dataset.userPaused) {
              v.play().catch(() => {});
            }
          } else {
            if (!v.paused) v.pause();
          }
        });
      }, { threshold: [0, 0.3, 0.7] })
    : null;

  videos.forEach((wrapper) => {
    const video = wrapper.querySelector('video');
    if (!video) return;

    // touch-устройства — показываем контролы после тапа
    wrapper.addEventListener('touchstart', () => {
      wrapper.classList.add('touched');
    }, { passive: true });

    // Play/Pause
    const playBtn = wrapper.querySelector('.video-play');
    const iconPlay = wrapper.querySelector('.icon-play');
    const iconPause = wrapper.querySelector('.icon-pause');

    function updatePlayIcon() {
      if (video.paused) {
        iconPlay.style.display = '';
        iconPause.style.display = 'none';
      } else {
        iconPlay.style.display = 'none';
        iconPause.style.display = '';
      }
    }

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused) {
        delete video.dataset.userPaused;
        video.play().catch(() => {});
      } else {
        video.dataset.userPaused = '1';
        video.pause();
      }
    });
    video.addEventListener('play', updatePlayIcon);
    video.addEventListener('pause', updatePlayIcon);

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
    else video.play().catch(() => {});
  });
})();
