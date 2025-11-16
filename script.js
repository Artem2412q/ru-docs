document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('dossier-backdrop');
  const closeTop = document.getElementById('dossier-close');
  const closeBottom = document.getElementById('dossier-close-bottom');
  const openBtns = document.querySelectorAll('[data-open-dossier]');

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

  openBtns.forEach(btn => btn.addEventListener('click', openDossier));
  if (closeTop) closeTop.addEventListener('click', closeDossier);
  if (closeBottom) closeBottom.addEventListener('click', closeDossier);

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeDossier();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDossier();
  });
});
