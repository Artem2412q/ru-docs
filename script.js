// Простое состояние в localStorage
const STORAGE_KEY = 'drive2_sector_state_v2';

const defaultState = {
  users: [],            // {id, username, password}
  currentUser: null,    // username
  orgUnlocked: false,
  posts: [],            // {id, author, title, text, attachments[], createdAt}
  chats: [],            // {id, title, isPrivate, owner, messages[]}
  nextUserId: 1,
  nextPostId: 1,
  nextChatId: 1
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = structuredClone(defaultState);
      // создаем общий чат по умолчанию
      initial.chats.push({
        id: 1,
        title: 'Общий чат',
        isPrivate: false,
        owner: null,
        messages: []
      });
      initial.nextChatId = 2;
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(defaultState), parsed);
  } catch (e) {
    console.warn('Не удалось загрузить состояние:', e);
    const initial = structuredClone(defaultState);
    initial.chats.push({
      id: 1,
      title: 'Общий чат',
      isPrivate: false,
      owner: null,
      messages: []
    });
    initial.nextChatId = 2;
    return initial;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Утилиты

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => (n < 10 ? '0' + n : String(n));
  return (
    pad(d.getDate()) +
    '.' +
    pad(d.getMonth() + 1) +
    '.' +
    d.getFullYear() +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// DOM запросы
const sideNav = document.getElementById('side-nav');
const viewCars = document.getElementById('view-cars');
const viewWall = document.getElementById('view-wall');
const viewOrg = document.getElementById('view-org');
const sideOrgLink = document.getElementById('side-org-link');

const authArea = document.getElementById('auth-area');

const keyBackdrop = document.getElementById('key-backdrop');
const keyCloseBtn = document.getElementById('key-close');
const keyInput = document.getElementById('key-input');
const keyApplyBtn = document.getElementById('key-apply');
const keyMessage = document.getElementById('key-message');

const authBackdrop = document.getElementById('auth-backdrop');
const authCloseBtn = document.getElementById('auth-close');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const registerForm = document.getElementById('register-form');
const regUsername = document.getElementById('reg-username');
const regPassword = document.getElementById('reg-password');
const authMessage = document.getElementById('auth-message');

// Стена
const postForm = document.getElementById('post-form');
const postTitleInput = document.getElementById('post-title');
const postTextInput = document.getElementById('post-text');
const postFilesInput = document.getElementById('post-files');
const postsContainer = document.getElementById('posts-container');

// Мессенджер
const newChatBtn = document.getElementById('new-chat-btn');
const chatListEl = document.getElementById('chat-list');
const chatMessagesEl = document.getElementById('chat-messages');
const chatTitleLabel = document.getElementById('chat-title-label');
const chatPrivacyLabel = document.getElementById('chat-privacy-label');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// текущее состояние UI
let currentView = 'cars';
let currentChatId = state.chats.length ? state.chats[0].id : null;

// === Навигация между разделами ===

if (sideNav) {
  sideNav.addEventListener('click', (e) => {
    const link = e.target.closest('.side-link');
    if (!link) return;
    e.preventDefault();
    const view = link.dataset.view;
    if (!view) return;

    document.querySelectorAll('.side-link').forEach((el) => {
      el.classList.toggle('active', el === link);
    });

    currentView = view;
    renderViews();
  });
}

function renderViews() {
  viewCars.classList.add('hidden');
  viewWall.classList.add('hidden');
  viewOrg.classList.add('hidden');

  if (currentView === 'cars') {
    viewCars.classList.remove('hidden');
  } else if (currentView === 'wall') {
    viewWall.classList.remove('hidden');
  } else if (currentView === 'org') {
    viewOrg.classList.remove('hidden');
  }
}

// === Авторизация ===

function renderAuthArea() {
  authArea.innerHTML = '';
  if (!state.currentUser) {
    const txt = document.createElement('div');
    txt.className = 'auth-chip';
    txt.textContent = 'Гость';
    const loginBtn = document.createElement('button');
    loginBtn.className = 'hdr-btn ghost';
    loginBtn.textContent = 'Войти';
    loginBtn.addEventListener('click', () => openAuthModal('login'));
    const regBtn = document.createElement('button');
    regBtn.className = 'hdr-btn primary';
    regBtn.textContent = 'Регистрация';
    regBtn.addEventListener('click', () => openAuthModal('register'));

    authArea.appendChild(txt);
    authArea.appendChild(loginBtn);
    authArea.appendChild(regBtn);
  } else {
    const txt = document.createElement('div');
    txt.className = 'auth-chip';
    txt.innerHTML = 'Вы вошли как <span>' + escapeHtml(state.currentUser) + '</span>';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'hdr-btn ghost';
    logoutBtn.textContent = 'Выйти';
    logoutBtn.addEventListener('click', () => {
      state.currentUser = null;
      saveState();
      renderAuthArea();
      renderWall();
      renderMessenger();
    });

    const keyBtn = document.createElement('button');
    keyBtn.className = 'hdr-btn primary';
    keyBtn.textContent = 'Код доступа';
    keyBtn.addEventListener('click', () => openKeyModal());

    authArea.appendChild(txt);
    authArea.appendChild(keyBtn);
    authArea.appendChild(logoutBtn);
  }
}

function openAuthModal(initialTab) {
  authMessage.textContent = '';
  authMessage.className = 'key-message';
  authBackdrop.classList.remove('hidden');
  switchAuthTab(initialTab || 'login');
}

function closeAuthModal() {
  authBackdrop.classList.add('hidden');
}

if (authCloseBtn) {
  authCloseBtn.addEventListener('click', closeAuthModal);
}

authTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    switchAuthTab(btn.dataset.tab);
  });
});

function switchAuthTab(tab) {
  authTabs.forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }
}

// Login
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    if (!username || !password) {
      setAuthMessage('Заполните ник и пароль.', false);
      return;
    }
    const user = state.users.find((u) => u.username === username);
    if (!user || user.password !== password) {
      setAuthMessage('Неверный логин или пароль.', false);
      return;
    }
    state.currentUser = user.username;
    saveState();
    setAuthMessage('Успешный вход.', true);
    setTimeout(() => {
      closeAuthModal();
      renderAuthArea();
      renderWall();
      renderMessenger();
    }, 350);
  });
}

// Register
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = regUsername.value.trim();
    const password = regPassword.value;
    if (!username || !password) {
      setAuthMessage('Заполните ник и пароль.', false);
      return;
    }
    if (password.length < 4) {
      setAuthMessage('Пароль должен содержать минимум 4 символа.', false);
      return;
    }
    if (state.users.some((u) => u.username === username)) {
      setAuthMessage('Такой ник уже занят.', false);
      return;
    }
    const user = {
      id: state.nextUserId++,
      username,
      password
    };
    state.users.push(user);
    state.currentUser = username;
    saveState();
    setAuthMessage('Аккаунт создан и вход выполнен.', true);
    setTimeout(() => {
      closeAuthModal();
      renderAuthArea();
      renderWall();
      renderMessenger();
    }, 400);
  });
}

function setAuthMessage(msg, ok) {
  authMessage.textContent = msg;
  authMessage.className = 'key-message ' + (ok ? 'ok' : 'err');
}

// === Модалка кода доступа ===

function openKeyModal() {
  keyMessage.textContent = '';
  keyMessage.className = 'key-message';
  keyInput.value = '';
  keyBackdrop.classList.remove('hidden');
  keyInput.focus();
}

function closeKeyModal() {
  keyBackdrop.classList.add('hidden');
}

if (keyCloseBtn && keyApplyBtn) {
  keyCloseBtn.addEventListener('click', closeKeyModal);
  keyApplyBtn.addEventListener('click', () => {
    const code = keyInput.value.trim();
    if (!code) {
      showKeyMessage('Введите код.', false);
      return;
    }
    if (code === 'code6.ru_drive2') {
      state.orgUnlocked = true;
      saveState();
      showKeyMessage('Доступ к разделу «Организация» активирован.', true);
      sideOrgLink.classList.remove('hidden');
    } else {
      showKeyMessage('Код не принят. Попробуйте ещё раз или свяжитесь с куратором.', false);
    }
  });
}

function showKeyMessage(msg, ok) {
  keyMessage.textContent = msg;
  keyMessage.className = 'key-message ' + (ok ? 'ok' : 'err');
}

// === Стена: посты ===

if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentUser) {
      alert('Чтобы публиковать посты, войдите или зарегистрируйтесь.');
      return;
    }
    const title = postTitleInput.value.trim();
    const text = postTextInput.value.trim();
    if (!title && !text && !postFilesInput.files.length) {
      alert('Нечего публиковать — добавьте текст или вложения.');
      return;
    }

    const files = Array.from(postFilesInput.files || []);
    const attachments = await readAttachments(files);

    const post = {
      id: state.nextPostId++,
      author: state.currentUser,
      title,
      text,
      attachments,
      createdAt: new Date().toISOString()
    };
    state.posts.unshift(post);
    saveState();

    postTitleInput.value = '';
    postTextInput.value = '';
    postFilesInput.value = '';

    renderWall();
  });
}

// чтение файлов как dataURL (осторожно с объёмом)
function readAttachments(files) {
  const maxCount = 4;
  const slice = files.slice(0, maxCount);
  const promises = slice.map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            dataUrl: reader.result
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      })
  );
  return Promise.all(promises).then((arr) => arr.filter(Boolean));
}

function renderWall() {
  if (!postsContainer) return;
  postsContainer.innerHTML = '';
  if (!state.posts.length) {
    const p = document.createElement('p');
    p.className = 'footer-note';
    p.textContent = 'Пока нет ни одного поста. Будьте первым — расскажите о своей машине.';
    postsContainer.appendChild(p);
    return;
  }

  state.posts.forEach((post) => {
    const item = document.createElement('article');
    item.className = 'post-item';

    const header = document.createElement('div');
    header.className = 'post-item-header';
    const author = document.createElement('div');
    author.className = 'post-item-author';
    author.textContent = post.author;
    const meta = document.createElement('div');
    meta.className = 'post-item-meta';
    meta.textContent = formatDateTime(post.createdAt);
    header.appendChild(author);
    header.appendChild(meta);

    const titleEl = document.createElement('div');
    titleEl.className = 'post-item-title';
    titleEl.textContent = post.title || '(без заголовка)';

    const textEl = document.createElement('div');
    textEl.className = 'post-item-text';
    textEl.textContent = post.text || '';

    item.appendChild(header);
    if (post.title) item.appendChild(titleEl);
    if (post.text) item.appendChild(textEl);

    if (post.attachments && post.attachments.length) {
      const wrap = document.createElement('div');
      wrap.className = 'post-attachments';
      post.attachments.forEach((att) => {
        if (att.type === 'video') {
          const v = document.createElement('video');
          v.src = att.dataUrl;
          v.controls = true;
          wrap.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = att.dataUrl;
          img.alt = att.name || '';
          wrap.appendChild(img);
        }
      });
      item.appendChild(wrap);
    }

    const footer = document.createElement('div');
    footer.className = 'post-footer';
    const fn = document.createElement('div');
    fn.className = 'footer-note';
    fn.textContent = 'Локальная публикация (хранится только в вашем браузере).';
    footer.appendChild(fn);
    item.appendChild(footer);

    postsContainer.appendChild(item);
  });
}

// === Мессенджер ===

if (newChatBtn) {
  newChatBtn.addEventListener('click', () => {
    if (!state.currentUser) {
      alert('Создавать чаты могут только авторизованные пользователи.');
      return;
    }
    const title = prompt('Название чата:');
    if (!title) return;
    const isPrivate = window.confirm('Сделать чат закрытым (виден только вам)?');
    const chat = {
      id: state.nextChatId++,
      title: title.trim(),
      isPrivate,
      owner: isPrivate ? state.currentUser : null,
      messages: []
    };
    state.chats.push(chat);
    saveState();
    currentChatId = chat.id;
    renderMessenger();
  });
}

if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.currentUser) {
      alert('Чтобы писать в чат, войдите или зарегистрируйтесь.');
      return;
    }
    const text = chatInput.value.trim();
    if (!text) return;
    const chat = state.chats.find((c) => c.id === currentChatId);
    if (!chat) return;

    // Проверка доступа для приватных чатов
    if (chat.isPrivate && chat.owner && chat.owner !== state.currentUser) {
      alert('Этот закрытый чат принадлежит другому пользователю.');
      return;
    }

    chat.messages.push({
      author: state.currentUser,
      text,
      createdAt: new Date().toISOString()
    });
    chatInput.value = '';
    saveState();
    renderMessenger();
  });
}

function renderMessenger() {
  if (!chatListEl || !chatMessagesEl) return;

  // фильтруем чаты по доступу
  const visibleChats = state.chats.filter((chat) => {
    if (!chat.isPrivate) return true;
    if (!state.currentUser) return false;
    return chat.owner === state.currentUser;
  });

  if (!visibleChats.length) {
    chatListEl.innerHTML = '<div class="footer-note">Нет доступных чатов.</div>';
    chatMessagesEl.innerHTML =
      '<p class="footer-note">Создайте новый чат, чтобы начать общение.</p>';
    chatTitleLabel.textContent = 'Мессенджер';
    chatPrivacyLabel.textContent = '';
    return;
  }

  // если текущий чат недоступен, выбираем первый
  if (!visibleChats.some((c) => c.id === currentChatId)) {
    currentChatId = visibleChats[0].id;
  }

  chatListEl.innerHTML = '';
  visibleChats.forEach((chat) => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
    const title = document.createElement('span');
    title.textContent = chat.title;
    const info = document.createElement('small');
    info.textContent = chat.isPrivate ? 'закрытый' : 'общий';
    item.appendChild(title);
    item.appendChild(info);
    item.addEventListener('click', () => {
      currentChatId = chat.id;
      renderMessenger();
    });
    chatListEl.appendChild(item);
  });

  const currentChat = visibleChats.find((c) => c.id === currentChatId);
  if (!currentChat) return;

  chatTitleLabel.textContent = currentChat.title;
  chatPrivacyLabel.textContent = currentChat.isPrivate
    ? 'Закрытый чат' + (currentChat.owner ? ` • владелец: ${currentChat.owner}` : '')
    : 'Публичный чат';

  chatMessagesEl.innerHTML = '';
  if (!currentChat.messages.length) {
    const p = document.createElement('p');
    p.className = 'footer-note';
    p.textContent = 'Сообщений пока нет. Напишите что-нибудь первым.';
    chatMessagesEl.appendChild(p);
  } else {
    currentChat.messages.forEach((msg) => {
      const row = document.createElement('div');
      row.className = 'chat-message';
      row.innerHTML =
        '<strong>' +
        escapeHtml(msg.author) +
        ':</strong> ' +
        escapeHtml(msg.text) +
        ' <span class="post-item-meta">(' +
        formatDateTime(msg.createdAt) +
        ')</span>';
      chatMessagesEl.appendChild(row);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
}

// === Инициализация ===

function init() {
  if (state.orgUnlocked) {
    sideOrgLink.classList.remove('hidden');
  }

  renderAuthArea();
  renderViews();
  renderWall();
  renderMessenger();
}

document.addEventListener('DOMContentLoaded', init);
