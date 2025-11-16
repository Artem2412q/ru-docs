document.addEventListener('DOMContentLoaded', () => {
  const ORG_KEY = 'code6.ru_drive2';
  const STORAGE_FLAG = 'drive2_org_unlocked';

  const orgLink = document.getElementById('side-org-link');
  const sideNav = document.getElementById('side-nav');
  const viewFeed = document.getElementById('view-feed');
  const viewOrg = document.getElementById('view-org');

  const keyBackdrop = document.getElementById('key-backdrop');
  const keyOpenBtn = document.getElementById('key-open-btn');
  const keyCloseBtn = document.getElementById('key-close');
  const keyApplyBtn = document.getElementById('key-apply');
  const keyInput = document.getElementById('key-input');
  const keyMessage = document.getElementById('key-message');

  function isUnlocked() {
    try {
      return window.localStorage.getItem(STORAGE_FLAG) === '1';
    } catch (e) {
      return false;
    }
  }

  function setUnlocked(value) {
    try {
      if (value) {
        window.localStorage.setItem(STORAGE_FLAG, '1');
      } else {
        window.localStorage.removeItem(STORAGE_FLAG);
      }
    } catch (e) {}
  }

  function updateOrgVisibility() {
    if (!orgLink) return;
    if (isUnlocked()) {
      orgLink.classList.remove('hidden');
    } else {
      orgLink.classList.add('hidden');
    }
  }

  function switchView(view) {
    if (!viewFeed || !viewOrg) return;
    if (view === 'org' && !isUnlocked()) {
      // если почему‑то кликнули до активации
      openKeyModal();
      return;
    }
    if (view === 'org') {
      viewOrg.classList.remove('hidden');
      viewFeed.classList.add('hidden');
    } else {
      viewFeed.classList.remove('hidden');
      viewOrg.classList.add('hidden');
    }
  }

  // Навигация по левой колонке
  if (sideNav) {
    sideNav.addEventListener('click', (e) => {
      const link = e.target.closest('.side-link');
      if (!link) return;
      e.preventDefault();
      const view = link.dataset.view || 'feed';

      // активный класс
      sideNav.querySelectorAll('.side-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      switchView(view);
    });
  }

  // Модалка с вводом ключа
  function openKeyModal() {
    if (!keyBackdrop) return;
    keyBackdrop.classList.remove('hidden');
    keyBackdrop.setAttribute('aria-hidden', 'false');
    keyMessage.textContent = '';
    keyMessage.classList.remove('ok', 'err');
    keyInput.value = '';
    setTimeout(() => keyInput && keyInput.focus(), 20);
  }

  function closeKeyModal() {
    if (!keyBackdrop) return;
    keyBackdrop.classList.add('hidden');
    keyBackdrop.setAttribute('aria-hidden', 'true');
  }

  if (keyOpenBtn) keyOpenBtn.addEventListener('click', openKeyModal);
  if (keyCloseBtn) keyCloseBtn.addEventListener('click', closeKeyModal);
  if (keyBackdrop) {
    keyBackdrop.addEventListener('click', (e) => {
      if (e.target === keyBackdrop) closeKeyModal();
    });
  }

  if (keyApplyBtn) {
    keyApplyBtn.addEventListener('click', () => {
      const val = (keyInput.value || '').trim();
      if (!val) {
        keyMessage.textContent = 'Введите код доступа.';
        keyMessage.classList.remove('ok');
        keyMessage.classList.add('err');
        return;
      }
      if (val === ORG_KEY) {
        setUnlocked(true);
        updateOrgVisibility();
        keyMessage.textContent = 'Код принят. Раздел «Организация» разблокирован.';
        keyMessage.classList.remove('err');
        keyMessage.classList.add('ok');
        setTimeout(() => {
          closeKeyModal();
          // сразу переключаемся на скрытый раздел
          const orgNavLink = document.getElementById('side-org-link');
          if (orgNavLink) {
            orgNavLink.classList.add('active');
            // снять active с остальных
            sideNav.querySelectorAll('.side-link').forEach(l => {
              if (l !== orgNavLink) l.classList.remove('active');
            });
          }
          switchView('org');
        }, 700);
      } else {
        keyMessage.textContent = 'Неверный код. Проверьте написание или обратитесь к куратору.';
        keyMessage.classList.remove('ok');
        keyMessage.classList.add('err');
      }
    });
  }

  if (keyInput) {
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        keyApplyBtn && keyApplyBtn.click();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeKeyModal();
    }
  });

  // Инициализация
  updateOrgVisibility();
  switchView('feed');
});
