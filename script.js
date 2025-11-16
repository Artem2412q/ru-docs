// Простое локальное состояние
const STORAGE_KEY = 'drive2_nevsky_state_v1';

const defaultState = {
  users: [],          // {login, password}
  currentUser: null,  // login
  orgUnlocked: false,
  communityUnlocked: false,
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

// Навигация по страницам
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');

function showPage(code) {
  pages.forEach(p => {
    p.classList.toggle('page-active', p.id === 'page-' + code);
    p.classList.toggle('hidden', p.id !== 'page-' + code);
  });
  navItems.forEach(btn => {
    btn.classList.toggle('nav-item-active', btn.dataset.page === code);
  });
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (!page) return;
    if ((page === 'org' || page === 'community') && !state.orgUnlocked) {
      alert('Доступ к этому разделу открыт только после ввода кода доступа.');
      return;
    }
    showPage(page);
  });
});

// Авторизация

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

// Код доступа

const accessCodeBtn = document.getElementById('access-code-btn');
const navOrg = document.getElementById('nav-org');
const navCommunity = document.getElementById('nav-community');

function updateSecretNav() {
  const enabled = !!state.orgUnlocked;
  [navOrg, navCommunity].forEach(el => {
    if (!el) return;
    if (enabled) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

accessCodeBtn.addEventListener('click', () => {
  const code = prompt('Введите код доступа (выдаётся администрацией проекта):');
  if (!code) return;
  if (code.trim() === 'code6.ru_drive2') {
    state.orgUnlocked = true;
    state.communityUnlocked = true;
    saveState();
    updateSecretNav();
    alert('Код подтверждён. Появились разделы «Сообщество» и «Организация».');
  } else {
    alert('Неверный код. Если вы уверены, что он правильный — свяжитесь с администрацией.');
  }
});

// Подать заявку: отправка в Google Форму (заполни свой ID формы и поля)
async function sendApplicationToGoogle(formData) {
  // TODO: замени на URL своей формы формата:
  // https://docs.google.com/forms/d/e/FORM_ID/formResponse
  const url = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';

  const body = new FormData();
  // TODO: замени entry.xxxxxx на реальные идентификаторы полей формы
  body.append('entry.1111111111', formData.lastName);
  body.append('entry.2222222222', formData.firstName);
  body.append('entry.3333333333', formData.car);
  body.append('entry.4444444444', formData.experience);
  body.append('entry.5555555555', formData.reason);

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body,
    });
    return true;
  } catch (e) {
    console.warn('Ошибка отправки заявки', e);
    return false;
  }
}

function initApplyPage() {
  const sendBtn = document.getElementById('apply-send-btn');
  const statusEl = document.getElementById('apply-status');
  if (!sendBtn) return;

  sendBtn.addEventListener('click', async () => {
    const lastName = document.getElementById('apply-lastname')?.value.trim() || '';
    const firstName = document.getElementById('apply-firstname')?.value.trim() || '';
    const car = document.getElementById('apply-car')?.value.trim() || '';
    const exp = document.getElementById('apply-exp')?.value.trim() || '';
    const reason = document.getElementById('apply-reason')?.value.trim() || '';

    if (!lastName || !firstName || !car || !exp || !reason) {
      alert('Пожалуйста, заполните все поля.');
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'Отправляем заявку...';
    }

    const ok = await sendApplicationToGoogle({
      lastName,
      firstName,
      car,
      experience: exp,
      reason,
    });

    if (ok && statusEl) {
      statusEl.textContent = 'Заявка отправлена. Спасибо! Мы свяжемся с вами при необходимости.';
    } else if (statusEl) {
      statusEl.textContent = 'Не удалось подтвердить отправку, но данные могли быть доставлены. Проверьте позже.';
    }
  });
}

// Инициализация

function init() {
  updateAuthUi();
  updateSecretNav();
  initApplyPage();
  showPage('cars');
}

document.addEventListener('DOMContentLoaded', init);
