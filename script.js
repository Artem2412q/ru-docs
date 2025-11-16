// Простое локальное состояние
const STORAGE_KEY = 'drive3_ru_state_v3';

const defaultState = {
  users: [],          // {login, password}
  currentUser: null,  // login
  secretUnlocked: false,
  theme: 'dark',      // 'dark' | 'light'
  wallet: 50000,      // виртуальный баланс в кредитах
  bets: [],           // история условных ставок
  orgOffset: 0,       // накопленный прогресс кошелька организации
  season: 1,          // текущий игровой сезон (для пула участников)
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
  return structuredClone(defaultState);
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
    if ((page === 'org' || page === 'community' || page === 'earn') && !state.secretUnlocked) {
      alert('Доступ к этому разделу открыт только после ввода кода доступа.');
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
      alert('Такой логин уже существует.');
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
const navEarn = document.getElementById('nav-earn');

const accessModal = document.getElementById('access-modal');
const accessModalClose = document.getElementById('access-modal-close');
const accessForm = document.getElementById('access-form');
const accessInput = document.getElementById('access-code-input');

function updateSecretNav() {
  const enabled = !!state.secretUnlocked;
  [navOrg, navCommunity, navEarn].forEach(el => {
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
    accessCodeBtn.textContent = 'Код доступа';
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

  if (code === 'code6.ru_drive3') {
    state.secretUnlocked = true;
    saveState();
    updateSecretNav();
    accessModal.classList.add('hidden');
    alert('Код подтверждён. Появились разделы «Сообщество», «Организация» и «Заработок».');
  } else {
    alert('Неверный код. Если вы уверены, что он правильный — свяжитесь с администрацией.');
  }
});

/* =========================
   Тема (светлая / тёмная)
   ========================= */

const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const walletAmountSpan = document.getElementById('wallet-amount');
const walletResetBtn = document.getElementById('wallet-reset-btn');
const seasonLabelSpan = document.getElementById('season-label');
const orgWalletAmountSpan = document.getElementById('org-wallet-amount');
const orgWalletDeltaSpan = document.getElementById('org-wallet-delta');
const orgWalletProgressFill = document.getElementById('org-wallet-progress-fill');
const orgWalletProgressLabel = document.getElementById('org-wallet-progress-label');

// базовый «скрытый» баланс организации: 3 единицы условного актива, сконвертированные в ₽
const ORG_WALLET_BASE_UNITS = 3;
const ORG_UNIT_TO_RUB = 6000000; // условный курс на момент сборки
const ORG_WALLET_BASE_RUB = ORG_WALLET_BASE_UNITS * ORG_UNIT_TO_RUB;
// целевое значение сезона для прогресс-бара (например, +50% к базовому балансу)
const ORG_WALLET_GOAL_RUB = Math.round(ORG_WALLET_BASE_RUB * 1.5);

function updateWalletUi() {
  if (!walletAmountSpan) return;
  const amount = Number(state.wallet || 0);
  walletAmountSpan.textContent = amount.toLocaleString('ru-RU');
}

function updateSeasonUi() {
  if (!seasonLabelSpan) return;
  const season = Number(state.season || 1);
  seasonLabelSpan.textContent = season;
}

function updateOrgWalletUi() {
  if (!orgWalletAmountSpan || !orgWalletDeltaSpan) return;
  const now = Date.now();
  // небольшие колебания вокруг базового значения, чтобы выглядело как мониторинг
  const phase = now / 60000; // минуты
  const offsetFactor = Math.sin(phase) * 0.015; // ±1.5%
  const extra = Number(state.orgOffset || 0);
  const baseWithExtra = ORG_WALLET_BASE_RUB + extra;
  const currentRub = Math.round(baseWithExtra * (1 + offsetFactor));

  const diff = currentRub - ORG_WALLET_BASE_RUB;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  orgWalletAmountSpan.textContent = currentRub.toLocaleString('ru-RU');

  if (diff === 0) {
    orgWalletDeltaSpan.textContent = 'без изменений за минуту';
  } else {
    orgWalletDeltaSpan.textContent = `${sign}${Math.abs(diff).toLocaleString('ru-RU')} ₽ за минуту`;
  }

  // прогресс сезона: от базового значения до целевого
  if (orgWalletProgressFill && orgWalletProgressLabel) {
    const progressRaw = (baseWithExtra - ORG_WALLET_BASE_RUB) / (ORG_WALLET_GOAL_RUB - ORG_WALLET_BASE_RUB);
    const progress = Math.max(0, Math.min(1, progressRaw));
    const percent = Math.round(progress * 100);
    orgWalletProgressFill.style.width = `${percent}%`;
    orgWalletProgressLabel.textContent = `Прогресс сезона: ${percent}%`;
  }
}


function playOrgProgressBump() {
  if (!orgWalletProgressFill) return;
  orgWalletProgressFill.classList.remove('bump');
  // принудительно перезапускаем анимацию
  void orgWalletProgressFill.offsetWidth;
  orgWalletProgressFill.classList.add('bump');
}


if (walletResetBtn) {
  walletResetBtn.addEventListener('click', () => {
    state.wallet = 50000;
    state.bets = [];
    state.orgOffset = 0;
    state.season = (Number(state.season || 1) + 1);
    saveState();
    updateWalletUi();
    updateOrgWalletUi();
    playOrgProgressBump();
    renderBetHistory();
    renderEarnCards();
    updateSeasonUi();
  });
}
e() {
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

// периодически обновляем мониторинг кошелька организации
setInterval(updateOrgWalletUi, 7000);

/* =========================
   Раздел «Заработок» — генерация карточек
   ========================= */

const earnMain = document.getElementById('earn-main');
const earnList = document.getElementById('earn-list');

const FIRST_NAMES = [
  'Алексей', 'Дмитрий', 'Иван', 'Максим', 'Сергей',
  'Егор', 'Кирилл', 'Никита', 'Павел', 'Роман',
  'Андрей', 'Владимир', 'Виталий', 'Олег', 'Степан'
];

const LAST_NAMES = [
  'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов',
  'Новиков', 'Федоров', 'Алексеев', 'Крылов', 'Ершов',
  'Соколов', 'Кудрявцев', 'Морозов', 'Громов', 'Воронин'
];

const CARS = [
  'BMW M3 F80', 'BMW M4 G82', 'Mercedes-Benz C63 AMG',
  'Mercedes-Benz E63 S', 'Nissan GT-R R35', 'Toyota Supra A90',
  'Subaru Impreza WRX STI', 'Mitsubishi Lancer Evolution X',
  'Audi RS3', 'Audi RS6', 'Alfa Romeo Giulia Quadrifoglio',
  'Lexus IS 350', 'Kia Stinger GT', 'Porsche 911 Carrera S',
  'Chevrolet Camaro SS'
];

const ODDS = [1.7, 1.9, 2.1, 2.4, 2.8, 3.2, 3.6];

// детерминированный генератор, чтобы у всех пользователей были одни и те же участники
let earnSeed = 123456;
function seededRandom() {
  earnSeed = (earnSeed * 1664525 + 1013904223) % 4294967296;
  return earnSeed / 4294967296;
}
function seededChoice(arr) {
  const idx = Math.floor(seededRandom() * arr.length);
  return arr[idx];
}

function generateParticipants(count = 6) {
  const participants = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    let fullName;
    let attempts = 0;
    do {
      const first = seededChoice(FIRST_NAMES);
      const last = seededChoice(LAST_NAMES);
      fullName = first + ' ' + last;
      attempts++;
    } while (usedNames.has(fullName) && attempts < 20);
    usedNames.add(fullName);

    const races = 5 + Math.floor(seededRandom() * 26); // 5-30
    const wins = Math.floor(races * (0.25 + seededRandom() * 0.45));
    const power = 350 + Math.floor(seededRandom() * 300);
    const reaction = (0.15 + seededRandom() * 0.25).toFixed(2);
    const reliability = 60 + Math.floor(seededRandom() * 40);
    const aggression = 40 + Math.floor(seededRandom() * 50);

    participants.push({
      id: 'p' + i,
      name: fullName,
      car: seededChoice(CARS),
      odds: seededChoice(ODDS),
      stats: {
        races,
        wins,
        power,
        reaction,
        reliability,
        aggression
      }
    });
  }
  return participants;
}

let participantsCache = [];
let selectedParticipantId = null;

function renderEarnCards() {
  // генерируем пул участников, привязанный к номеру сезона
  const season = Number(state.season || 1);
  earnSeed = 123456 + season * 1000;
  participantsCache = generateParticipants(6);
  selectedParticipantId = null;
  renderEarnList();
  renderEarnMain(null);
}



function getPopularParticipantId() {
  if (!Array.isArray(state.bets) || !state.bets.length) return null;
  const counts = {};
  state.bets.forEach(bet => {
    const id = bet.participantId;
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });
  let bestId = null;
  let bestCount = 0;
  Object.entries(counts).forEach(([id, count]) => {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  });
  return bestId;
}


function renderEarnList() {
  if (!earnList) return;
  earnList.innerHTML = '';
  const popularId = getPopularParticipantId();

  participantsCache.forEach((p, index) => {
    const mini = document.createElement('div');
    mini.className = 'earn-mini-card';
    mini.dataset.id = p.id;

    let extraHtml = '';
    if (popularId && p.id === popularId) {
      extraHtml = `
        <div class="earn-mini-row earn-mini-extra">
          <span class="earn-mini-popular-label">лидер ставок</span>
        </div>
      `;
      mini.classList.add('earn-mini-popular');
    }

    mini.innerHTML = `
      <div class="earn-mini-top">
        <div class="earn-mini-name">${p.name}</div>
        <div class="earn-mini-tag">#${index + 1}</div>
      </div>
      <div class="earn-mini-row">
        <div class="earn-mini-label">Автомобиль</div>
        <div class="earn-mini-value">${p.car}</div>
      </div>
      <div class="earn-mini-row">
        <div class="earn-mini-label">Коэфф.</div>
        <div class="earn-mini-value earn-mini-odds">×${p.odds.toFixed(2)}</div>
      </div>
      ${extraHtml}
    `;

    mini.addEventListener('click', () => {
      selectParticipant(p.id);
    });

    earnList.appendChild(mini);
  });

  // если уже кто-то выбран — подсветим
  highlightSelectedInList();
}

function highlightSelectedInList() {
  if (!earnList) return;
  const cards = Array.from(earnList.querySelectorAll('.earn-mini-card'));
  cards.forEach(card => {
    const isSelected = card.dataset.id === selectedParticipantId;
    card.classList.toggle('selected', isSelected);
  });
}

function renderEarnMain(participant) {
  if (!earnMain) return;
  if (!participant) {
    earnMain.innerHTML = `
      <div class="earn-main-placeholder muted small">
        Выберите участника справа, чтобы увидеть детальную статистику по нему и автомобилю.
      </div>
    `;
    return;
  }

  earnMain.innerHTML = `
    <div class="earn-main-card">
      <div class="earn-main-header">
        <div>
          <div class="earn-main-name">${participant.name}</div>
          <div class="earn-main-car">${participant.car}</div>
        </div>
        <div class="earn-main-odds">
          Коэффициент<br>
          <strong>×${participant.odds.toFixed(2)}</strong>
        </div>
      </div>

      <div class="earn-main-meta">
        <span class="earn-pill">Заездов: ${participant.stats.races}</span>
        <span class="earn-pill">Побед: ${participant.stats.wins}</span>
        <span class="earn-pill">Мощность: ${participant.stats.power} л.с.</span>
        <span class="earn-pill">Реакция: ${participant.stats.reaction} с</span>
        <span class="earn-pill">Надёжность: ${participant.stats.reliability}%</span>
        <span class="earn-pill">Агрессия: ${participant.stats.aggression}%</span>
      </div>

      <div class="earn-orbit">
        <div class="earn-orbit-ring"></div>
        <div class="earn-orbit-center">
          <div class="earn-orbit-name">${participant.name}</div>
          <div class="earn-orbit-car">${participant.car}</div>
          <div class="earn-orbit-odds">Коэф. ×${participant.odds.toFixed(2)}</div>
        </div>
        <div class="earn-orbit-item pos-top">
          Заездов<br><strong>${participant.stats.races}</strong>
        </div>
        <div class="earn-orbit-item pos-right">
          Побед<br><strong>${participant.stats.wins}</strong>
        </div>
        <div class="earn-orbit-item pos-bottom">
          Мощность<br><strong>${participant.stats.power} л.с.</strong>
        </div>
        <div class="earn-orbit-item pos-left">
          Реакция<br><strong>${participant.stats.reaction} с</strong>
        </div>
        <div class="earn-orbit-item pos-diag-left">
          Надёжность<br><strong>${participant.stats.reliability}%</strong>
        </div>
        <div class="earn-orbit-item pos-diag-right">
          Агрессия<br><strong>${participant.stats.aggression}%</strong>
        </div>
      </div>

      <div class="earn-main-footer">
        <select class="earn-select">
          <option value="500">500 кредитов</option>
          <option value="1000">1 000 кредитов</option>
          <option value="2000">2 000 кредитов</option>
          <option value="5000">5 000 кредитов</option>
        </select>
        <button type="button" class="btn btn-primary btn-xs earn-main-bet-btn">
          Поставить (игрово)
        </button>
      </div>
      <p class="earn-note muted small">
        Потенциальный выигрыш считается по формуле: ставка × коэффициент.
        Все кредиты внутриигровые, реальные деньги не используются.
      </p>
      <div class="bet-history" id="bet-history">
        <div class="bet-history-header">
          <span>История ставок</span>
          <button type="button" class="btn btn-ghost btn-xs" id="bet-history-clear">Очистить</button>
        </div>
        <div class="bet-history-list" id="bet-history-list"></div>
      </div>
    </div>
  `;

  const betBtn = earnMain.querySelector('.earn-main-bet-btn');
  const selectEl = earnMain.querySelector('.earn-select');

  betBtn.addEventListener('click', () => {
    const amount = Number(selectEl.value || 0);
    if (!amount || amount <= 0) return;

    const current = Number(state.wallet || 0);
    if (current < amount) {
      alert('Недостаточно средств на игровом балансе для такой ставки. Уменьшите сумму или обновите раунд.');
      return;
    }

    const potentialWin = amount * participant.odds;
    state.wallet = current - amount;

    // небольшая доля ставки уходит в прогресс кошелька организации
    const houseCut = Math.round(amount * 0.02);
    state.orgOffset = (Number(state.orgOffset || 0) + houseCut);

    // сохраняем ставку в историю до пересчёта интерфейса
    const betRecord = {
      id: Date.now(),
      user: state.currentUser || 'Аноним',
      participantId: participant.id,
      name: participant.name,
      car: participant.car,
      amount,
      odds: participant.odds,
      potentialWin
    };

    if (!Array.isArray(state.bets)) {
      state.bets = [];
    }
    state.bets.unshift(betRecord);
    // ограничим историю, чтобы не разрасталась бесконечно
    state.bets = state.bets.slice(0, 20);

    saveState();
    updateWalletUi();
    updateOrgWalletUi();
    playOrgProgressBump();
    renderBetHistory();
    renderEarnList();

    const message =
      `Вы условно поставили ${amount.toLocaleString('ru-RU')} кредитов на участника "${participant.name}".` +
      `\nТекущий игровой баланс: ${state.wallet.toLocaleString('ru-RU')} кредитов.` +
      `\n\nТеоретический выигрыш (игровой): ${potentialWin.toLocaleString('ru-RU', {maximumFractionDigits: 0})} кредитов.` +
      `\n\nВсе расчёты остаются частью сеттинга проекта, реальные деньги не используются.`;

    alert(message);
  });
}

function renderBetHistory() {
  const listEl = document.getElementById('bet-history-list');
  const clearBtn = document.getElementById('bet-history-clear');
  if (!listEl) return;

  const bets = Array.isArray(state.bets) ? state.bets : [];
  listEl.innerHTML = '';

  if (!bets.length) {
    const empty = document.createElement('div');
    empty.className = 'bet-history-empty muted small';
    empty.textContent = 'Ставок пока нет. Сделайте первую условную ставку, чтобы увидеть историю.';
    listEl.appendChild(empty);
  } else {
    bets.forEach((bet) => {
      const row = document.createElement('div');
      row.className = 'bet-history-row';
      row.innerHTML = `
        <div class="bet-history-line">
          <span class="bet-history-user">${bet.user || 'Аноним'}</span>
          <span class="bet-history-text">поставил(а)</span>
          <span class="bet-history-amount">${bet.amount.toLocaleString('ru-RU')} кр.</span>
          <span class="bet-history-text">на</span>
          <span class="bet-history-name">${bet.name}</span>
          <span class="bet-history-car muted small">(${bet.car})</span>
          <span class="bet-history-odds muted small">коэф. ×${Number(bet.odds).toFixed(2)}</span>
          <span class="bet-history-win muted small">
            / потенц. выигрыш: ${Math.round(bet.potentialWin).toLocaleString('ru-RU')} кр.
          </span>
        </div>
      `;
      listEl.appendChild(row);
    });
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      state.bets = [];
      saveState();
      renderBetHistory();
    };
  }
}

function selectParticipant(id) {
  selectedParticipantId = id;
  const participant = participantsCache.find(p => p.id === id) || null;
  highlightSelectedInList();
  renderEarnMain(participant);
}

/* =========================
   Инициализация
   ========================= */

function init() {
  applyTheme();
  updateAuthUi();
  updateSecretNav();
  updateWalletUi();
  updateOrgWalletUi();
  updateSeasonUi();
  showPage('cars');
  renderEarnCards();
  renderBetHistory();
}

document.addEventListener('DOMContentLoaded', init);
