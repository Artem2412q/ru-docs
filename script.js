
// === Простое состояние в localStorage ===
const STORAGE_KEY = 'elka_dispatcher_state_v2';

const defaultState = {
  role: '',
  calls: [],
  resources: [],
  orientations: [],
  notes: '',
  historyCalls: [],
  nextCallId: 1,
  nextResourceId: 1,
  nextOrientationId: 1
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === Общие утилиты ===
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
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

// === Инициализация карты ===
function initElkaMap() {
  const mapRoot = document.getElementById('elka-map');
  if (!mapRoot) return;

  const svg = mapRoot.querySelector('svg');
  if (!svg) return;
  const content = svg.querySelector('#map-content');
  const scaleLabel = document.getElementById('map-scale-label');

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  function applyTransform() {
    content.setAttribute(
      'transform',
      `translate(${translateX} ${translateY}) scale(${scale})`
    );
    if (scaleLabel) {
      scaleLabel.textContent = Math.round(scale * 100) + '%';
    }
  }

  // Зум колесом
  mapRoot.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(3, Math.max(0.5, scale * factor));
      scale = newScale;
      applyTransform();
    },
    { passive: false }
  );

  // Панорамирование
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  mapRoot.addEventListener('mousedown', (e) => {
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
    mapRoot.classList.add('is-panning');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    translateX += dx / scale;
    translateY += dy / scale;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    mapRoot.classList.remove('is-panning');
  });

  // Кнопки зума
  document.querySelectorAll('.map-zoom').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.mapZoom === 'in' ? 1 : -1;
      const factor = dir > 0 ? 1.2 : 0.8;
      const newScale = Math.min(3, Math.max(0.5, scale * factor));
      scale = newScale;
      applyTransform();
    });
  });

  applyTransform();
}

// === Инициализация диспетчера ===
function initDispatcher() {
  const root = document.getElementById('dispatcher-root');
  if (!root) return;

  const currentRoleSpan = document.getElementById('current-role');
  if (currentRoleSpan && state.role === 'dispatcher') {
    currentRoleSpan.textContent = '(Диспетчер)';
  }

  const themeToggle = document.getElementById('theme-toggle');
  const goHomeBtn = document.getElementById('go-home-btn');
  const activeCallsCount = document.getElementById('active-calls-count');

  const callForm = document.getElementById('call-form');
  const callStreetInput = document.getElementById('call-street');
  const callDescInput = document.getElementById('call-desc');
  const callPrioritySelect = document.getElementById('call-priority');
  const callsTableBody = document.getElementById('calls-table-body');

  const resForm = document.getElementById('resource-form');
  const resNameInput = document.getElementById('res-name');
  const resAppInput = document.getElementById('res-app');
  const resStatusSelect = document.getElementById('res-status');
  const resCallSelect = document.getElementById('res-call');
  const resourcesTableBody = document.getElementById('resources-table-body');
  const mergeResourcesBtn = document.getElementById('merge-resources-btn');

  const orientationModal = document.getElementById('orientation-modal');
  const orientationForm = document.getElementById('orientation-form');
  const addOrientationBtn = document.getElementById('add-orientation-btn');
  const orientationClose = document.getElementById('orientation-close');
  const orientationCancel = document.getElementById('orientation-cancel');
  const orientationTableBody = document.getElementById('orientation-table-body');

  const notesField = document.getElementById('notes-field');
  const notesStatus = document.getElementById('notes-status');

  const historyBtn = document.getElementById('history-btn');
  const historyModal = document.getElementById('history-modal');
  const historyClose = document.getElementById('history-close');
  const historyCloseBottom = document.getElementById('history-close-bottom');
  const historyTableBody = document.getElementById('history-table-body');

  // Тема
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const body = document.body;
      if (body.classList.contains('theme-dark')) {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
      } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
      }
    });
  }

  // К выбору роли
  if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Шрифт
  document.querySelectorAll('.font-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = Number(btn.dataset.font || 0);
      const html = document.documentElement;
      const current = parseFloat(
        getComputedStyle(html).getPropertyValue('font-size')
      );
      const next = Math.min(18, Math.max(12, current + dir));
      html.style.fontSize = next + 'px';
    });
  });

  // Вызовы
  function updateActiveCallsCounter() {
    if (!activeCallsCount) return;
    const count = state.calls.length;
    activeCallsCount.textContent = String(count);
  }

  callForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const street = callStreetInput.value.trim();
    const desc = callDescInput.value.trim();
    const priority = callPrioritySelect.value || 'Обычный';

    if (!street || !desc) {
      alert('Укажите улицу и описание вызова.');
      return;
    }

    const call = {
      id: state.nextCallId++,
      street,
      desc,
      priority,
      status: 'Новый',
      createdAt: new Date().toISOString()
    };
    state.calls.push(call);
    callStreetInput.value = '';
    callDescInput.value = '';
    callPrioritySelect.value = 'Обычный';
    saveState();
    renderCalls();
    renderResources();
    renderCallsInResourceSelect();
  });

  function renderCalls() {
    callsTableBody.innerHTML = '';
    state.calls.forEach((call) => {
      const tr = document.createElement('tr');
      const resNames = state.resources
        .filter((r) => r.callId === call.id)
        .map((r) => r.name);
      tr.innerHTML = `
        <td>${call.id}</td>
        <td>${escapeHtml(call.street)}</td>
        <td>${escapeHtml(call.desc)}</td>
        <td>${escapeHtml(call.priority || '')}</td>
        <td>
          <select class="input-select input-select-sm call-status" data-id="${call.id}">
            <option value="Новый"${call.status === 'Новый' ? ' selected' : ''}>Новый</option>
            <option value="В работе"${call.status === 'В работе' ? ' selected' : ''}>В работе</option>
            <option value="Завершён"${call.status === 'Завершён' ? ' selected' : ''}>Завершён</option>
          </select>
        </td>
        <td>${resNames.length ? escapeHtml(resNames.join(', ')) : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-action="delete-call" data-id="${call.id}">
            В историю
          </button>
        </td>
      `;
      callsTableBody.appendChild(tr);
    });
    updateActiveCallsCounter();
  }

  callsTableBody.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('call-status')) {
      const id = Number(target.dataset.id);
      const call = state.calls.find((c) => c.id === id);
      if (call) {
        call.status = target.value;
        saveState();
        renderCalls();
      }
    }
  });

  callsTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if (action === 'delete-call') {
      if (
        !confirm(
          'Перенести вызов #' +
            id +
            ' в историю и удалить из активных?'
        )
      )
        return;

      state.resources.forEach((r) => {
        if (r.callId === id) r.callId = null;
      });

      const idx = state.calls.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const [removed] = state.calls.splice(idx, 1);
        removed.closedAt = new Date().toISOString();
        state.historyCalls.push(removed);
      }

      saveState();
      renderCalls();
      renderResources();
      renderCallsInResourceSelect();
    }
  });

  function renderCallsInResourceSelect() {
    const selected = resCallSelect.value;
    resCallSelect.innerHTML = '<option value="">— Нет —</option>';
    state.calls.forEach((call) => {
      const opt = document.createElement('option');
      opt.value = call.id;
      opt.textContent = '#' + call.id + ': ' + call.street;
      resCallSelect.appendChild(opt);
    });
    if (selected) {
      resCallSelect.value = selected;
    }
  }

  // Ресурсы
  resForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = resNameInput.value.trim();
    const app = resAppInput.value.trim();
    if (!name) {
      alert('Введите позывной экипажа.');
      return;
    }

    const res = {
      id: state.nextResourceId++,
      name,
      app,
      status: resStatusSelect.value || 'Свободен',
      callId: resCallSelect.value ? Number(resCallSelect.value) : null,
      members: []
    };
    state.resources.push(res);

    resNameInput.value = '';
    resAppInput.value = '';
    resStatusSelect.value = 'Свободен';
    resCallSelect.value = '';

    saveState();
    renderResources();
    renderCalls();
  });

  function renderResources() {
    resourcesTableBody.innerHTML = '';
    state.resources.forEach((res) => {
      const callOptions = state.calls
        .map(
          (call) => `
          <option value="${call.id}"${
            res.callId === call.id ? ' selected' : ''
          }>
            #${call.id}: ${escapeHtml(call.street)}
          </option>`
        )
        .join('');
      const members =
        res.members && res.members.length
          ? escapeHtml(res.members.join(', '))
          : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="checkbox" class="res-select" data-id="${res.id}">
        </td>
        <td>${escapeHtml(res.name)}</td>
        <td>${escapeHtml(res.app || '')}</td>
        <td>
          <select class="input-select input-select-sm resource-status" data-id="${res.id}">
            <option value="Свободен"${
              res.status === 'Свободен' ? ' selected' : ''
            }>Свободен</option>
            <option value="В пути"${
              res.status === 'В пути' ? ' selected' : ''
            }>В пути</option>
            <option value="На месте"${
              res.status === 'На месте' ? ' selected' : ''
            }>На месте</option>
            <option value="Недоступен"${
              res.status === 'Недоступен' ? ' selected' : ''
            }>Недоступен</option>
          </select>
        </td>
        <td>
          <select class="input-select input-select-sm resource-call" data-id="${res.id}">
            <option value="">— Нет —</option>
            ${callOptions}
          </select>
        </td>
        <td>${members}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-action="edit-resource" data-id="${res.id}">
            Изменить
          </button>
          <button class="btn btn-ghost btn-sm" data-action="delete-resource" data-id="${res.id}">
            Удалить
          </button>
        </td>
      `;
      resourcesTableBody.appendChild(tr);
    });
  }

  resourcesTableBody.addEventListener('change', (e) => {
    const target = e.target;
    const id = Number(target.dataset.id);
    const res = state.resources.find((r) => r.id === id);
    if (!res) return;

    if (target.classList.contains('resource-status')) {
      res.status = target.value;
      saveState();
      renderResources();
    }

    if (target.classList.contains('resource-call')) {
      const val = target.value;
      res.callId = val ? Number(val) : null;
      saveState();
      renderResources();
      renderCalls();
      renderCallsInResourceSelect();
    }
  });

  resourcesTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const res = state.resources.find((r) => r.id === id);
    if (!res) return;

    if (action === 'delete-resource') {
      if (!confirm('Удалить ресурс #' + id + '?')) return;
      state.resources = state.resources.filter((r) => r.id !== id);
      saveState();
      renderResources();
      renderCalls();
      return;
    }

    if (action === 'edit-resource') {
      const newName = prompt('Позывной экипажа:', res.name);
      if (newName === null) return;
      const newApp = prompt('Канал / приложение:', res.app || '');
      if (newApp === null) return;
      res.name = newName.trim() || res.name;
      res.app = newApp.trim();
      saveState();
      renderResources();
      renderCalls();
      return;
    }
  });

  // Объединение экипажей
  if (mergeResourcesBtn) {
    mergeResourcesBtn.addEventListener('click', () => {
      const checked = Array.from(
        resourcesTableBody.querySelectorAll('.res-select:checked')
      );
      if (checked.length < 2) {
        alert('Выберите минимум два экипажа для объединения.');
        return;
      }
      const ids = checked.map((ch) => Number(ch.dataset.id));
      const baseId = ids[0];
      const base = state.resources.find((r) => r.id === baseId);
      if (!base) return;

      const label = prompt('Позывной объединённого экипажа', base.name);
      if (label === null) return;

      const others = ids
        .filter((id) => id !== baseId)
        .map((id) => state.resources.find((r) => r.id === id))
        .filter(Boolean);

      base.name = (label || base.name).trim();
      base.members = base.members || [];
      others.forEach((o) => {
        if (!base.members.includes(o.name)) {
          base.members.push(o.name);
        }
      });

      state.resources = state.resources.filter(
        (r) => !ids.includes(r.id) || r.id === baseId
      );
      saveState();
      renderResources();
      renderCalls();
    });
  }

  // Ориентировки
  function openOrientationModal() {
    orientationModal.classList.remove('hidden');
  }

  function closeOrientationModal() {
    orientationModal.classList.add('hidden');
    orientationForm.reset();
  }

  addOrientationBtn.addEventListener('click', openOrientationModal);
  orientationClose.addEventListener('click', closeOrientationModal);
  orientationCancel.addEventListener('click', closeOrientationModal);

  orientationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('orientation-type').value;
    const title = document.getElementById('orientation-title').value.trim();
    const desc = document.getElementById('orientation-desc').value.trim();

    if (!title || !desc) {
      alert('Заполните заголовок и описание.');
      return;
    }

    const item = {
      id: state.nextOrientationId++,
      type,
      title,
      desc,
      active: true
    };
    state.orientations.push(item);
    saveState();
    renderOrientations();
    closeOrientationModal();
  });

  function renderOrientations() {
    orientationTableBody.innerHTML = '';
    state.orientations.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.desc)}</td>
        <td>${item.active ? 'Да' : 'Нет'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-action="toggle-orientation" data-id="${item.id}">
            ${item.active ? 'Деактивировать' : 'Активировать'}
          </button>
          <button class="btn btn-ghost btn-sm" data-action="delete-orientation" data-id="${item.id}">
            Удалить
          </button>
        </td>
      `;
      orientationTableBody.appendChild(tr);
    });
  }

  orientationTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const item = state.orientations.find((o) => o.id === id);
    if (!item) return;

    if (action === 'toggle-orientation') {
      item.active = !item.active;
    } else if (action === 'delete-orientation') {
      if (!confirm('Удалить ориентировку?')) return;
      state.orientations = state.orientations.filter((o) => o.id !== id);
    }
    saveState();
    renderOrientations();
  });

  // Заметки
  notesField.value = state.notes || '';
  notesField.addEventListener('input', () => {
    state.notes = notesField.value;
    if (notesStatus) notesStatus.textContent = 'Сохранено';
    saveState();
    setTimeout(() => {
      if (notesStatus) notesStatus.textContent = 'Загружено';
    }, 600);
  });

  // История
  function renderHistoryCalls() {
    historyTableBody.innerHTML = '';
    state.historyCalls.forEach((call) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${call.id}</td>
        <td>${escapeHtml(call.street)}</td>
        <td>${escapeHtml(call.desc)}</td>
        <td>${escapeHtml(call.priority || '')}</td>
        <td>${escapeHtml(call.status || '')}</td>
        <td>${formatDate(call.createdAt)}</td>
        <td>${call.closedAt ? formatDate(call.closedAt) : '—'}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  function openHistory() {
    renderHistoryCalls();
    historyModal.classList.remove('hidden');
  }

  function closeHistory() {
    historyModal.classList.add('hidden');
  }

  historyBtn.addEventListener('click', openHistory);
  historyClose.addEventListener('click', closeHistory);
  historyCloseBottom.addEventListener('click', closeHistory);

  // Стартовый рендер
  renderCalls();
  renderResources();
  renderOrientations();
  renderCallsInResourceSelect();
  updateActiveCallsCounter();
  initElkaMap();
}


// === Инициализация выбора роли ===
function initRoleSelector() {
  const root = document.querySelector('.role-root');
  if (!root) return;

  const select = document.getElementById('role-select');
  const btn = document.getElementById('role-continue');

  // подставим сохранённую роль, если есть
  if (state.role) {
    select.value = state.role;
  }

  btn.addEventListener('click', () => {
    const value = select.value;
    if (!value) {
      alert('Выберите роль.');
      return;
    }

    // сохраним выбранную роль
    state.role = value;
    saveState();

    // рабочий интерфейс сейчас только у диспетчера
    let target = 'dispatcher.html';
    if (value === 'dispatcher') {
      target = 'dispatcher.html';
    } else if (value === 'citizen') {
      target = 'citizen.html';
    } else if (value === 'forces') {
      target = 'forces.html';
    } else if (value === 'rescue') {
      target = 'rescue.html';
    }

    window.location.href = target;
  });
}
// === Инициализация общая ===
window.addEventListener('DOMContentLoaded', () => {
  initRoleSelector();
  initDispatcher();

  const goHomeBtn = document.getElementById('go-home-btn');
  const themeToggle = document.getElementById('theme-toggle');

  if (goHomeBtn && !document.getElementById('dispatcher-root')) {
    goHomeBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (themeToggle && !document.getElementById('dispatcher-root')) {
    themeToggle.addEventListener('click', () => {
      const body = document.body;
      if (body.classList.contains('theme-dark')) {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
      } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
      }
    });
  }
});
