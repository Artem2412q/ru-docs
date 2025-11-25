// Простое локальное состояние
const STORAGE_KEY = 'bhb_site_state_v2';

const defaultState = {
  users: [],          // {login, password}
  currentUser: null,  // login
  secretUnlocked: false,
  theme: 'dark',      // 'dark' | 'light'
  bounties: {
    green: false,
    mccarthy: false,
    kelly: false,
    nolan: false
  }
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.assign({}, defaultState, parsed);
    }
  } catch (e) {
    console.warn('Не удалось загрузить состояние', e);
  }
  return { ...defaultState };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Не удалось сохранить состояние', e);
  }
}

/* =========================
   Навигация по страницам
   ========================= */

const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');

function showPage(code) {
  pages.forEach(p => {
    const active = p.id === 'page-' + code;
    p.classList.toggle('page-active', active);
    p.classList.toggle('hidden', !active);
  });
  navItems.forEach(btn => {
    btn.classList.toggle('nav-item-active', btn.dataset.page === code);
  });
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (!page) return;
    if ((page === 'org' || page === 'community' || page === 'bounty' || page === 'market') && !state.secretUnlocked) {
      alert('Эти разделы открываются только после ввода кода кровавой клятвы.');
      return;
    }
    showPage(page);
  });
});

/* =========================
   Авторизация
   ========================= */

const authAnon = document.getElementById('auth-anon');
const authUser = document.getElementById('auth-user');
const authUsernameSpan = document.getElementById('auth-username');

const loginOpenBtn = document.getElementById('login-open');
const registerOpenBtn = document.getElementById('register-open');
const logoutBtn = document.getElementById('logout-btn');

const authModal = document.getElementById('auth-modal');
const authModalTitle = document.getElementById('auth-modal-title');
const authForm = document.getElementById('auth-form');
const authLoginInput = document.getElementById('auth-login');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchModeBtn = document.getElementById('auth-switch-mode');
const authCloseBtn = document.getElementById('auth-modal-close');

let authMode = 'login'; // or 'register'

function openAuth(mode) {
  authMode = mode;
  if (mode === 'login') {
    authModalTitle.textContent = 'Вход';
    authSubmitBtn.textContent = 'Войти';
    authSwitchModeBtn.textContent = 'Создать аккаунт';
  } else {
    authModalTitle.textContent = 'Регистрация';
    authSubmitBtn.textContent = 'Зарегистрироваться';
    authSwitchModeBtn.textContent = 'У меня уже есть аккаунт';
  }
  authLoginInput.value = '';
  authPasswordInput.value = '';
  authModal.classList.remove('hidden');
  authLoginInput.focus();
}

function closeAuth() {
  authModal.classList.add('hidden');
}

loginOpenBtn.addEventListener('click', () => openAuth('login'));
registerOpenBtn.addEventListener('click', () => openAuth('register'));
authCloseBtn.addEventListener('click', closeAuth);

authSwitchModeBtn.addEventListener('click', () => {
  openAuth(authMode === 'login' ? 'register' : 'login');
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const login = authLoginInput.value.trim();
  const password = authPasswordInput.value;
  if (!login || !password) {
    alert('Заполните логин и пароль.');
    return;
  }

  if (authMode === 'register') {
    if (state.users.some(u => u.login === login)) {
      alert('Такой ник уже занят.');
      return;
    }
    state.users.push({ login, password });
    state.currentUser = login;
    saveState();
    updateAuthUi();
    closeAuth();
  } else {
    const user = state.users.find(u => u.login === login && u.password === password);
    if (!user) {
      alert('Неверный логин или пароль.');
      return;
    }
    state.currentUser = login;
    saveState();
    updateAuthUi();
    closeAuth();
  }
});

logoutBtn.addEventListener('click', () => {
  state.currentUser = null;
  saveState();
  updateAuthUi();
});

function updateAuthUi() {
  if (state.currentUser) {
    authAnon.classList.add('hidden');
    authUser.classList.remove('hidden');
    authUsernameSpan.textContent = state.currentUser;
  } else {
    authAnon.classList.remove('hidden');
    authUser.classList.add('hidden');
    authUsernameSpan.textContent = '';
  }
}

/* =========================
   Код доступа
   ========================= */

const accessCodeBtn = document.getElementById('access-code-btn');
const navOrg = document.getElementById('nav-org');
const navCommunity = document.getElementById('nav-community');
const navBounty = document.getElementById('nav-bounty');
const navMarket = document.getElementById('nav-market');
const navFallen = document.getElementById('nav-fallen');

const accessModal = document.getElementById('access-modal');
const accessModalClose = document.getElementById('access-modal-close');
const accessForm = document.getElementById('access-form');
const accessInput = document.getElementById('access-code-input');

function updateSecretNav() {
  const enabled = !!state.secretUnlocked;
  [navOrg, navCommunity, navBounty, navMarket, navFallen].forEach(el => {
    if (!el) return;
    if (enabled) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  if (enabled) {
    accessCodeBtn.classList.add('btn-success');
    accessCodeBtn.textContent = 'Код активен';
  } else {
    accessCodeBtn.classList.remove('btn-success');
    accessCodeBtn.textContent = 'Код кровавой клятвы';
  }
}

accessCodeBtn.addEventListener('click', () => {
  accessInput.value = '';
  accessModal.classList.remove('hidden');
  accessInput.focus();
});

accessModalClose.addEventListener('click', () => {
  accessModal.classList.add('hidden');
});

accessForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = accessInput.value.trim();
  if (!code) return;

  if (code === 'BHB_Watts_187') {
    state.secretUnlocked = true;
    saveState();
    updateSecretNav();
    accessModal.classList.add('hidden');
    alert('Код подтверждён. Открыты разделы со структурой, территорией, охотой и продажами.');
  } else {
    alert('Неверный код. Свяжитесь с лидером / админом, если не уверены.');
  }
});

/* =========================
   Тема (светлая / тёмная)
   ========================= */

const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

function applyTheme() {
  const theme = state.theme === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme === 'light');
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  themeToggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

themeToggleBtn.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
});

/* =========================
   Кошелёк BHB — 10 BTC
   ========================= */

const orgWalletAmountSpan = document.getElementById('org-wallet-amount');
const orgWalletDeltaSpan = document.getElementById('org-wallet-delta');
const orgWalletProgressFill = document.getElementById('org-wallet-progress-fill');
const orgWalletProgressLabel = document.getElementById('org-wallet-progress-label');

const BTC_AMOUNT = 10;
const ORG_GOAL_USD = 3000000;

let lastBtcPrice = null;
let lastUpdatedAt = null;

async function fetchBtcPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    const price = data?.bitcoin?.usd;
    if (typeof price !== 'number') throw new Error('no price');
    lastBtcPrice = price;
    lastUpdatedAt = Date.now();
    updateOrgWalletUi();
  } catch (e) {
    console.warn('Не удалось получить курс BTC', e);
    if (!lastBtcPrice) {
      orgWalletDeltaSpan.textContent = 'Ошибка загрузки курса BTC';
    }
  }
}

function updateOrgWalletUi() {
  if (!orgWalletAmountSpan || !orgWalletDeltaSpan) return;

  const price = lastBtcPrice || 60000; // запасной курс
  const totalUsd = price * BTC_AMOUNT;
  orgWalletAmountSpan.textContent = `$${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  let deltaText = `Курс BTC: $${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (lastUpdatedAt) {
    const secondsAgo = Math.round((Date.now() - lastUpdatedAt) / 1000);
    deltaText += ` · обновлено ${secondsAgo}s назад`;
  } else {
    deltaText += ' · ожидаем первое обновление…';
  }
  orgWalletDeltaSpan.textContent = deltaText;

  if (orgWalletProgressFill && orgWalletProgressLabel) {
    const progress = Math.max(0, Math.min(1, totalUsd / ORG_GOAL_USD));
    const percent = Math.round(progress * 100);
    orgWalletProgressFill.style.width = `${percent}%`;
    orgWalletProgressLabel.textContent = `Цель: $${ORG_GOAL_USD.toLocaleString('en-US')} · выполнено ${percent}%`;
  }
}

function startBtcUpdates() {
  fetchBtcPrice();
  setInterval(fetchBtcPrice, 60000);
}

/* =========================
   Статус охоты
   ========================= */

function updateBountyUi() {
  if (!state.bounties) {
    state.bounties = { green: false, mccarthy: false, kelly: false, nolan: false };
  }

  const rows = document.querySelectorAll('.bounty-status-row');
  rows.forEach(row => {
    const target = row.dataset.target;
    if (!target) return;

    const statusEl = row.querySelector('.bounty-status');
    const btn = row.querySelector('.bounty-toggle');
    if (!statusEl || !btn) return;

    const isCaught = !!state.bounties[target];

    if (isCaught) {
      statusEl.textContent = 'Статус: цель поймана';
      statusEl.classList.remove('bounty-status-open');
      statusEl.classList.add('bounty-status-closed');
      btn.textContent = 'Пометить как свободную';
    } else {
      statusEl.textContent = 'Статус: цель на свободе';
      statusEl.classList.add('bounty-status-open');
      statusEl.classList.remove('bounty-status-closed');
      btn.textContent = 'Отметить как пойман';
    }

    btn.onclick = (e) => {
      e.stopPropagation();
      const current = !!state.bounties[target];
      state.bounties = Object.assign({}, state.bounties, { [target]: !current });
      saveState();
      updateBountyUi();
    };
  });
}
/* =========================
   Маркет / фильтрация
   ========================= */

const marketSearchInput = document.getElementById('market-search');
const marketGrid = document.getElementById('market-grid');
const marketChips = document.getElementById('market-chips');

let marketFilter = 'all';
let marketSearch = '';

function applyMarketFilter() {
  if (!marketGrid) return;
  const cards = marketGrid.querySelectorAll('.market-card');
  const term = marketSearch.toLowerCase();

  cards.forEach(card => {
    const category = card.dataset.category || 'other';
    const tags = (card.dataset.tags || '').toLowerCase();
    const title = (card.querySelector('h3')?.textContent || '').toLowerCase();

    const matchCategory = marketFilter === 'all' || marketFilter === category;
    const matchSearch = !term || tags.includes(term) || title.includes(term);

    const visible = matchCategory && matchSearch;
    card.style.display = visible ? '' : 'none';
  });
}

if (marketSearchInput) {
  marketSearchInput.addEventListener('input', () => {
    marketSearch = marketSearchInput.value.trim();
    applyMarketFilter();
  });
}

if (marketChips) {
  marketChips.addEventListener('click', (e) => {
    const btn = e.target.closest('.market-chip');
    if (!btn) return;
    marketFilter = btn.dataset.filter || 'all';

    Array.from(marketChips.querySelectorAll('.market-chip')).forEach(chip => {
      chip.classList.toggle('market-chip-active', chip === btn);
    });

    applyMarketFilter();
  });
}


/* =========================
   Выбор цели охоты и выбор товара
   ========================= */

function setupBountySelection() {
  const cards = document.querySelectorAll('.bounty-target-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('bounty-selected'));
      card.classList.add('bounty-selected');
    });
  });
}

function setupMarketSelection() {
  if (!marketGrid) return;
  const cards = marketGrid.querySelectorAll('.market-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('market-card-selected'));
      card.classList.add('market-card-selected');
    });
  });
}

/* =========================
   Кровавые капли и атмосфера на странице павших
   ========================= */

function spawnBloodDrops() {
  const layer = document.getElementById('blood-drip-layer');
  if (!layer) return;

  setInterval(() => {
    const drop = document.createElement('div');
    drop.classList.add('blood-drop');

    drop.style.left = Math.random() * 100 + 'vw';
    const speed = 3 + Math.random() * 3;
    drop.style.animationDuration = speed + 's';

    layer.appendChild(drop);

    setTimeout(() => {
      drop.remove();
    }, speed * 1000 + 250);
  }, 260);
}

function setupFallenAtmosphere() {
  const audio = document.getElementById('fallen-audio');
  const btn = document.getElementById('fallen-atmo-btn');
  const fallenSection = document.getElementById('page-fallen');

  if (!fallenSection) return;

  // запустить капли
  spawnBloodDrops();

  if (!audio || !btn) return;

  let playing = false;

  btn.addEventListener('click', () => {
    if (!playing) {
      audio.volume = 0.35;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      btn.textContent = 'Выключить атмосферу';
      playing = true;
    } else {
      audio.pause();
      audio.currentTime = 0;
      btn.textContent = 'Включить атмосферу';
      playing = false;
    }
  });
}
/* =========================
   Инициализация
   ========================= */

function init() {
  applyTheme();
  updateAuthUi();
  updateSecretNav();
  updateBountyUi();
  updateOrgWalletUi();
  startBtcUpdates();
  applyMarketFilter();
  setupBountySelection();
  setupMarketSelection();
  setupFallenAtmosphere();
  showPage('cars');
}

document.addEventListener('DOMContentLoaded', init);


// Авторазмьют саундтрека BHB после первого клика по странице
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', () => {
    const iframe = document.querySelector('.cars-music-player iframe');
    if (!iframe) return;
    const src = iframe.getAttribute('src') || '';
    if (src.includes('unmuted')) return;
    iframe.src = 'https://www.youtube.com/embed/QPvciPNCID4?autoplay=1&loop=1&playlist=QPvciPNCID4&unmuted';
  }, { once: true });
});
