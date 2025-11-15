document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('dossier-backdrop');
  const closeBtn = document.getElementById('dossier-close');
  const closeBottomBtn = document.getElementById('dossier-close-bottom');
  const openButtons = document.querySelectorAll('[data-open-dossier]');
  const scrollButtons = document.querySelectorAll('[data-scroll-target]');

  function openDossier() {
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  function closeDossier() {
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    backdrop.setAttribute('aria-hidden', 'true');
  }

  openButtons.forEach(btn => {
    btn.addEventListener('click', openDossier);
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDossier);
  if (closeBottomBtn) closeBottomBtn.addEventListener('click', closeDossier);

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeDossier();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDossier();
    }
  });

  scrollButtons.forEach(btn => {
    const targetSelector = btn.getAttribute('data-scroll-target');
    if (!targetSelector) return;
    const target = document.querySelector(targetSelector);
    if (!target) return;

    btn.addEventListener('click', () => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});
