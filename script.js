// === Состояние ===
const STORAGE_KEY = 'elka_dispatcher_state_v1';

const defaultState = {
  calls: [],
  historyCalls: [],
  resources: [],
  orientations: [],
  notes: '',
  nextCallId: 1,
  nextResourceId: 1,
  nextOrientationId: 1
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign({}, defaultState, JSON.parse(raw));
  } catch (e) {
    console.warn('Не удалось загрузить состояние', e);
  }
  return { ...defaultState };
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Утилиты
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function formatDateTime(d) {
  const pad = n => (n < 10 ? '0' + n : n);
  return (
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
    ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear()
  );
}

// === Экран выбора роли ===
function initRoleScreen() {
  const select = document.getElementById('role-select');
  const btn = document.getElementById('role-continue');
  if (!select || !btn) return;

  btn.addEventListener('click', () => {
    const role = select.value;
    if (!role) {
      alert('Выберите роль');
      return;
    }
    if (role === 'dispatcher') {
      window.location.href = 'dispatcher.html';
    } else {
      alert('Эта роль пока на техобслуживании. Используйте «Диспетчер».');
    }
  });
}

// === Диспетчер ===
function initDispatcher() {
  const backToRoles = document.getElementById('back-to-roles');
  if (backToRoles) {
    backToRoles.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  const callForm = document.getElementById('call-form');
  const callStreetInput = document.getElementById('call-street');
  const callDescInput = document.getElementById('call-desc');
  const callPrioritySelect = document.getElementById('call-priority');
  const callsTableBody = document.getElementById('calls-table-body');
  const historyBtn = document.getElementById('history-btn');
  const activeCallsCount = document.getElementById('active-calls-count');

  const resForm = document.getElementById('resource-form');
  const resNameInput = document.getElementById('res-name');
  const resAppInput = document.getElementById('res-app');
  const resStatusSelect = document.getElementById('res-status');
  const resCallSelect = document.getElementById('res-call');
  const resourcesTableBody = document.getElementById('resources-table-body');
  const mergeBtn = document.getElementById('merge-resources-btn');

  const orientationModal = document.getElementById('orientation-modal');
  const orientationForm = document.getElementById('orientation-form');
  const orientationClose = document.getElementById('orientation-close');
  const orientationCancel = document.getElementById('orientation-cancel');
  const orientationTableBody = document.getElementById('orientation-table-body');

  const notesField = document.getElementById('notes-field');
  const notesStatus = document.getElementById('notes-status');

  // Вызовы
  if (callForm) {
    callForm.addEventListener('submit', e => {
      e.preventDefault();
      const street = callStreetInput.value.trim();
      const desc = callDescInput.value.trim();
      if (!street || !desc) {
        alert('Заполните улицу и описание.');
        return;
      }
      const call = {
        id: state.nextCallId++,
        street,
        desc,
        priority: callPrioritySelect.value || 'Обычный',
        createdAt: new Date().toISOString(),
        status: 'Новый',
        resources: []
      };
      state.calls.push(call);
      callStreetInput.value = '';
      callDescInput.value = '';
      callPrioritySelect.value = 'Обычный';
      saveState();
      renderCalls();
      renderResources();
      renderCallOptionsForResources();
    });
  }

  function moveCallToHistory(id) {
    const idx = state.calls.findIndex(c => c.id === id);
    if (idx === -1) return;
    const call = state.calls[idx];
    state.resources.forEach(r => {
      if (r.callId === id) r.callId = null;
    });
    state.calls.splice(idx, 1);
    state.historyCalls.push({
      ...call,
      closedAt: new Date().toISOString()
    });
    saveState();
  }

  function renderCalls() {
    if (!callsTableBody) return;
    callsTableBody.innerHTML = '';
    state.calls.forEach(call => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${call.id}</td>
        <td>${escapeHtml(call.street)}</td>
        <td>${escapeHtml(call.desc)}</td>
        <td>${escapeHtml(call.priority)}</td>
        <td>
          <select class="input-select input-select-sm call-status" data-id="${call.id}">
            <option value="Новый"${call.status === 'Новый' ? ' selected' : ''}>Новый</option>
            <option value="В работе"${call.status === 'В работе' ? ' selected' : ''}>В работе</option>
            <option value="Завершён"${call.status === 'Завершён' ? ' selected' : ''}>Завершён</option>
          </select>
        </td>
        <td>${call.resources && call.resources.length ? call.resources.join(', ') : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-action="to-history" data-id="${call.id}">В историю</button>
          <button class="btn btn-ghost btn-sm" data-action="delete-call" data-id="${call.id}">Удалить</button>
        </td>
      `;
      callsTableBody.appendChild(tr);
    });
    if (activeCallsCount) activeCallsCount.textContent = String(state.calls.length);
  }

  if (callsTableBody) {
    callsTableBody.addEventListener('change', e => {
      const target = e.target;
      if (target.classList.contains('call-status')) {
        const id = Number(target.dataset.id);
        const call = state.calls.find(c => c.id === id);
        if (!call) return;
        call.status = target.value;
        if (call.status === 'Завершён') {
          moveCallToHistory(id);
        }
        saveState();
        renderCalls();
        renderResources();
        renderCallOptionsForResources();
      }
    });

    callsTableBody.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === 'delete-call') {
        if (!confirm('Удалить вызов #' + id + '?')) return;
        state.resources.forEach(r => {
          if (r.callId === id) r.callId = null;
        });
        state.calls = state.calls.filter(c => c.id !== id);
        saveState();
        renderCalls();
        renderResources();
        renderCallOptionsForResources();
      }
      if (action === 'to-history') {
        if (!confirm('Перенести вызов #' + id + ' в историю?')) return;
        moveCallToHistory(id);
        renderCalls();
        renderResources();
        renderCallOptionsForResources();
      }
    });
  }

  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      if (!state.historyCalls.length) {
        alert('История пуста.');
        return;
      }
      const lines = state.historyCalls
        .slice()
        .reverse()
        .map(c => {
          const opened = formatDateTime(new Date(c.createdAt));
          const closed = c.closedAt ? formatDateTime(new Date(c.closedAt)) : '-';
          return `#${c.id} ${c.street} — ${c.desc} [${c.priority}] (${opened} → ${closed})`;
        });
      alert('История вызовов:\n\n' + lines.join('\n'));
    });
  }

  function renderCallOptionsForResources() {
    if (!resCallSelect) return;
    const selected = resCallSelect.value;
    resCallSelect.innerHTML = '<option value="">— Нет —</option>';
    state.calls.forEach(call => {
      const opt = document.createElement('option');
      opt.value = call.id;
      opt.textContent = '#' + call.id + ': ' + call.street;
      resCallSelect.appendChild(opt);
    });
    if (selected) resCallSelect.value = selected;
  }

  // Ресурсы
  if (resForm) {
    resForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = resNameInput.value.trim();
      const app = resAppInput.value.trim();
      if (!name) {
        alert('Введите позывной.');
        return;
      }
      const res = {
        id: state.nextResourceId++,
        name,
        app,
        status: resStatusSelect.value || 'Свободен',
        callId: resCallSelect.value ? Number(resCallSelect.value) : null,
        type: 'crew',
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
  }

  function rebuildCallResourcesFromRes() {
    state.calls.forEach(c => (c.resources = []));
    state.resources.forEach(res => {
      if (res.callId) {
        const call = state.calls.find(c => c.id === res.callId);
        if (call) {
          if (!call.resources) call.resources = [];
          call.resources.push(res.name);
        } else {
          res.callId = null;
        }
      }
    });
  }

  function renderResources() {
    if (!resourcesTableBody) return;
    rebuildCallResourcesFromRes();

    resourcesTableBody.innerHTML = '';
    state.resources.forEach(res => {
      const callOptions = state.calls
        .map(
          call => `
          <option value="${call.id}"${res.callId === call.id ? ' selected' : ''}>
            #${call.id}: ${escapeHtml(call.street)}
          </option>`
        )
        .join('');
      const typeLabel = res.type === 'group' ? 'Группа' : 'Экипаж';
      const members = res.members && res.members.length ? res.members.join(', ') : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="res-select" data-id="${res.id}" /></td>
        <td>${escapeHtml(res.name)}</td>
        <td>${escapeHtml(res.app || '')}</td>
        <td>${typeLabel}</td>
        <td>
          <select class="input-select input-select-sm resource-status" data-id="${res.id}">
            <option value="Свободен"${res.status === 'Свободен' ? ' selected' : ''}>Свободен</option>
            <option value="В пути"${res.status === 'В пути' ? ' selected' : ''}>В пути</option>
            <option value="На месте"${res.status === 'На месте' ? ' selected' : ''}>На месте</option>
            <option value="Недоступен"${res.status === 'Недоступен' ? ' selected' : ''}>Недоступен</option>
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
          <button class="btn btn-ghost btn-sm" data-action="edit-resource" data-id="${res.id}">Изменить</button>
          <button class="btn btn-ghost btn-sm" data-action="delete-resource" data-id="${res.id}">Удалить</button>
        </td>
      `;
      resourcesTableBody.appendChild(tr);

      const callSelect = tr.querySelector('.resource-call');
      if (callSelect) callSelect.value = res.callId ? String(res.callId) : '';
    });

    rebuildCallResourcesFromRes();
    renderCalls();
  }

  if (resourcesTableBody) {
    resourcesTableBody.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      const res = state.resources.find(r => r.id === id);
      if (!res) return;

      if (action === 'delete-resource') {
        if (!confirm('Удалить ресурс #' + id + '?')) return;
        state.resources = state.resources.filter(r => r.id !== id);
        saveState();
        renderResources();
      }
      if (action === 'edit-resource') {
        const newName = prompt('Позывной:', res.name);
        if (newName === null) return;
        const newApp = prompt('Канал / приложение:', res.app || '');
        if (newApp === null) return;
        res.name = newName.trim() || res.name;
        res.app = newApp.trim();
        saveState();
        renderResources();
      }
    });

    resourcesTableBody.addEventListener('change', e => {
      const target = e.target;
      const id = Number(target.dataset.id);
      const res = state.resources.find(r => r.id === id);
      if (!res) return;

      if (target.classList.contains('resource-status')) {
        res.status = target.value;
        saveState();
        renderResources();
      }
      if (target.classList.contains('resource-call')) {
        res.callId = target.value ? Number(target.value) : null;
        saveState();
        renderResources();
      }
    });
  }

  if (mergeBtn && resourcesTableBody) {
    mergeBtn.addEventListener('click', () => {
      const checkboxes = resourcesTableBody.querySelectorAll('.res-select:checked');
      if (checkboxes.length < 2) {
        alert('Отметьте минимум два экипажа.');
        return;
      }
      const ids = Array.from(checkboxes).map(cb => Number(cb.dataset.id));
      const selected = state.resources.filter(r => ids.includes(r.id));
      if (!selected.length) return;
      const base = selected[0];
      const groupName = prompt('Позывной объединённой группы:', base.name);
      if (!groupName) return;
      base.type = 'group';
      base.name = groupName.trim();
      base.members = selected.map(r => r.name);
      state.resources = state.resources.filter(r => r.id === base.id || !ids.includes(r.id));
      saveState();
      renderResources();
    });
  }

  // Ориентировки
  function openOrientationModal() {
    if (orientationModal) orientationModal.classList.remove('hidden');
  }
  function closeOrientationModal() {
    if (!orientationModal) return;
    orientationModal.classList.add('hidden');
    if (orientationForm) orientationForm.reset();
  }

  const addOrientationBtn = document.getElementById('add-orientation-btn');
  if (addOrientationBtn) addOrientationBtn.addEventListener('click', openOrientationModal);
  if (orientationClose) orientationClose.addEventListener('click', closeOrientationModal);
  if (orientationCancel) orientationCancel.addEventListener('click', closeOrientationModal);

  if (orientationForm) {
    orientationForm.addEventListener('submit', e => {
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
  }

  function renderOrientations() {
    if (!orientationTableBody) return;
    orientationTableBody.innerHTML = '';
    state.orientations.forEach(item => {
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

  if (orientationTableBody) {
    orientationTableBody.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const item = state.orientations.find(o => o.id === id);
      if (!item) return;
      const action = btn.dataset.action;
      if (action === 'toggle-orientation') {
        item.active = !item.active;
      } else if (action === 'delete-orientation') {
        if (!confirm('Удалить ориентировку?')) return;
        state.orientations = state.orientations.filter(o => o.id !== id);
      }
      saveState();
      renderOrientations();
    });
  }

  // Заметки
  if (notesField) {
    notesField.value = state.notes || '';
    notesField.addEventListener('input', () => {
      state.notes = notesField.value;
      if (notesStatus) notesStatus.textContent = 'Сохранение...';
      saveState();
      if (notesStatus) {
        setTimeout(() => {
          notesStatus.textContent = 'Загружено';
        }, 400);
      }
    });
  }

  // Первичная отрисовка
  renderCallOptionsForResources();
  renderResources();
  renderCalls();
  renderOrientations();
}

// Инициализация в зависимости от страницы
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path === '/' || !path.includes('.html')) {
    initRoleScreen();
  } else if (path.endsWith('dispatcher.html')) {
    initDispatcher();
  }
});
