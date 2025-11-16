// Простое локальное состояние
const STORAGE_KEY = 'drive3_ru_state_v3';

const defaultState = {
  users: [],          // {login, password}
  currentUser: null,  // login
  secretUnlocked: false,
  theme: 'dark',      // 'dark' | 'light'
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
   Раздел «Заработок» — генерация карточек
   ========================= */

const earnGrid = document.getElementById('earn-grid');

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

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateParticipants(count = 6) {
  const participants = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    let fullName;
    let attempts = 0;
    do {
      fullName = getRandomItem(FIRST_NAMES) + ' ' + getRandomItem(LAST_NAMES);
      attempts++;
    } while (usedNames.has(fullName) && attempts < 10);
    usedNames.add(fullName);

    const races = 5 + Math.floor(Math.random() * 26); // 5-30
    const wins = Math.floor(races * (0.25 + Math.random() * 0.45));
    const power = 350 + Math.floor(Math.random() * 300);
    const reaction = (0.15 + Math.random() * 0.25).toFixed(2);
    const reliability = 60 + Math.floor(Math.random() * 40);
    const aggression = 40 + Math.floor(Math.random() * 50);

    participants.push({
      id: 'p' + i + '_' + Date.now(),
      name: fullName,
      car: getRandomItem(CARS),
      odds: getRandomItem(ODDS),
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

function renderEarnCards() {
  if (!earnGrid) return;
  earnGrid.innerHTML = '';
  participantsCache = generateParticipants(6);

  participantsCache.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'earn-card';
    card.dataset.id = p.id;

    card.innerHTML = `
      <div class="earn-main">
        <div class="earn-row earn-header-row">
          <div class="earn-name">${p.name}</div>
          <div class="earn-tag">Участник #${index + 1}</div>
        </div>
        <div class="earn-row">
          <div class="earn-label">Автомобиль</div>
          <div class="earn-value">${p.car}</div>
        </div>
        <div class="earn-row">
          <div class="earn-label">Коэффициент на победу</div>
          <div class="earn-value odds">×${p.odds.toFixed(2)}</div>
        </div>
        <div class="earn-row earn-bet-row">
          <div class="earn-label">Условная ставка</div>
          <div class="earn-bet-controls">
            <select class="earn-select">
              <option value="500">500 кредитов</option>
              <option value="1000">1 000 кредитов</option>
              <option value="2000">2 000 кредитов</option>
              <option value="5000">5 000 кредитов</option>
            </select>
            <button type="button" class="btn btn-primary btn-xs earn-bet-btn">Поставить</button>
          </div>
        </div>
      </div>
      <div class="earn-orbit">
        <div class="earn-orbit-ring"></div>
        <div class="earn-orbit-center">
          <div class="earn-orbit-name">${p.name}</div>
          <div class="earn-orbit-car">${p.car}</div>
          <div class="earn-orbit-odds">Коэф. ×${p.odds.toFixed(2)}</div>
        </div>
        <div class="earn-orbit-item pos-top">
          Заездов<br><strong>${p.stats.races}</strong>
        </div>
        <div class="earn-orbit-item pos-right">
          Побед<br><strong>${p.stats.wins}</strong>
        </div>
        <div class="earn-orbit-item pos-bottom">
          Мощность<br><strong>${p.stats.power} л.с.</strong>
        </div>
        <div class="earn-orbit-item pos-left">
          Реакция<br><strong>${p.stats.reaction} с</strong>
        </div>
        <div class="earn-orbit-item pos-diag-left">
          Надёжность<br><strong>${p.stats.reliability}%</strong>
        </div>
        <div class="earn-orbit-item pos-diag-right">
          Агрессия<br><strong>${p.stats.aggression}%</strong>
        </div>
      </div>
      <p class="earn-note muted small">
        Потенциальный выигрыш считается по формуле: ставка × коэффициент.
        Все кредиты внутриигровые, реальные деньги не используются.
      </p>
    `;

    const betBtn = card.querySelector('.earn-bet-btn');
    const select = card.querySelector('.earn-select');

    // Ставка — только расчёт, без переключения анимации
    betBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const amount = Number(select.value || 0);
      const potentialWin = amount * p.odds;

      const message =
        `Вы условно поставили ${amount.toLocaleString('ru-RU')} кредитов на участника "${p.name}".` +
        `\n\nТеоретический выигрыш (игровой): ${potentialWin.toLocaleString('ru-RU', {maximumFractionDigits: 0})} кредитов.` +
        `\n\nВсе расчёты остаются частью сеттинга проекта, реальные деньги не используются.`;

      alert(message);
    });

    // Выбор кандидата — плавная анимация и раскрытие статистики
    card.addEventListener('click', () => {
      expandEarnCard(p.id);
    });

    earnGrid.appendChild(card);
  });
}

function expandEarnCard(id) {
  if (!earnGrid) return;

  const cards = Array.from(earnGrid.querySelectorAll('.earn-card'));
  let target = null;

  cards.forEach(card => {
    const isTarget = card.dataset.id === id;
    if (isTarget) target = card;
    card.classList.toggle('earn-card-expanded', isTarget);
    card.classList.toggle('earn-card-collapsed', !isTarget);
  });

  if (target) {
    earnGrid.classList.add('earn-expanded-mode');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* =========================
   Инициализация
   ========================= */

function init() {
  applyTheme();
  updateAuthUi();
  updateSecretNav();
  showPage('cars');
  renderEarnCards();
}

document.addEventListener('DOMContentLoaded', init);
