// Общее состояние и localStorage
const STORAGE_KEY = 'elka_state_v1';

const defaultState = {
  calls: [],
  resources: [],
  orientations: [],
  notes: '',
  persons: [],
  vehicles: [],
  nextCallId: 1,
  nextResourceId: 1,
  nextOrientationId: 1,
  nextPersonId: 1,
  nextVehicleId: 1
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return Object.assign({}, defaultState, JSON.parse(raw));
    }
  } catch (e) {
    console.warn('Не удалось загрузить состояние', e);
  }
  return { ...defaultState };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Тема
const THEME_KEY = 'elka_theme';

function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');
  body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const theme = stored === 'dark' ? 'dark' : 'light';
  applyTheme(theme);
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains('theme-dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
}

// Утилиты
function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = n => (n < 10 ? '0' + n : n);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function formatDob(dobStr) {
  if (!dobStr) return '';
  const d = new Date(dobStr);
  if (isNaN(d.getTime())) return dobStr;
  const pad = n => (n < 10 ? '0' + n : n);
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Инициализация по странице
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();

  const page = document.body.dataset.page;

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (page === 'dispatcher') initDispatcher();
  if (page === 'citizen') initCitizen();
  if (page === 'forces') initForces();
  if (page === 'rescue') initRescue();
});

// ==== ДИСПЕТЧЕР ====

function initDispatcher() {
  const callForm = document.getElementById('call-form');
  if (!callForm) return; // защита

  const callStreetInput = document.getElementById('call-street');
  const callDescInput = document.getElementById('call-desc');
  const callsTableBody = document.getElementById('calls-table-body');

  const resForm = document.getElementById('resource-form');
  const resNameInput = document.getElementById('res-name');
  const resAppInput = document.getElementById('res-app');
  const resStatusSelect = document.getElementById('res-status');
  const resCallSelect = document.getElementById('res-call');
  const resourcesTableBody = document.getElementById('resources-table-body');

  const mapClickLayer = document.getElementById('map-click-layer');
  const mapMarkerLayer = document.getElementById('map-marker-layer');
  let markerPlacementCallId = null;


  const orientationModal = document.getElementById('orientation-modal');
  const orientationForm = document.getElementById('orientation-form');
  const addOrientationBtn = document.getElementById('add-orientation-btn');
  const orientationClose = document.getElementById('orientation-close');
  const orientationCancel = document.getElementById('orientation-cancel');
  const orientationTableBody = document.getElementById('orientation-table-body');

  const notesField = document.getElementById('notes-field');
  const notesStatus = document.getElementById('notes-status');
  const activeCallsCount = document.getElementById('active-calls-count');

  function updateActiveCallsCounter() {
    if (!activeCallsCount) return;
    const count = state.calls.filter(c => c.status !== 'Завершён').length;
    activeCallsCount.textContent = count;
  }

  // Вызовы
  callForm.addEventListener('submit', (e) => {
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
      createdAt: new Date().toISOString(),
      status: 'Новый',
      resources: []
    };
    state.calls.push(call);
    callStreetInput.value = '';
    callDescInput.value = '';
    saveState();
    renderCalls();
    renderResources();
    renderCallsInResourceSelect();
  });

  function renderCalls() {
    callsTableBody.innerHTML = '';
    state.calls.forEach((call) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${call.id}</td>
        <td>${escapeHtml(call.street)}</td>
        <td>${formatDate(call.createdAt)}</td>
        <td>${escapeHtml(call.desc)}</td>
        <td>
          <select class="input-select input-select-sm call-status" data-id="${call.id}">
            <option value="Новый"${call.status === 'Новый' ? ' selected' : ''}>Новый</option>
            <option value="В работе"${call.status === 'В работе' ? ' selected' : ''}>В работе</option>
            <option value="Завершён"${call.status === 'Завершён' ? ' selected' : ''}>Завершён</option>
          </select>
        </td>
        <td>${call.resources.length ? call.resources.join(', ') : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-action="place-marker" data-id="${call.id}">
            Метка
          </button>
          <button class="btn btn-ghost btn-sm" data-action="delete-call" data-id="${call.id}">
            Удалить
          </button>
        </td>
      `;
      callsTableBody.appendChild(tr);
    });
    updateActiveCallsCounter();
    renderMapMarkers();
  }

  callsTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('call-status')) {
      const id = Number(e.target.dataset.id);
      const call = state.calls.find(c => c.id === id);
      if (call) {
        call.status = e.target.value;
        saveState();
        updateActiveCallsCounter();
      }
    }
  });

  callsTableBody.addEventListener('click', (e) => {
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
      renderCallsInResourceSelect();
    }

    if (action === 'place-marker') {
      if (!mapClickLayer) return;
      markerPlacementCallId = id;
      mapClickLayer.classList.add('active');
      alert('Кликните по карте, чтобы установить точку для вызова #' + id);
    }
  });

  function renderCallsInResourceSelect() {
    const selected = resCallSelect.value;
    resCallSelect.innerHTML = '<option value="">— Нет —</option>';
    state.calls.forEach(call => {
      const opt = document.createElement('option');
      opt.value = call.id;
      opt.textContent = `#${call.id}: ${call.street}`;
      resCallSelect.appendChild(opt);
    });
    if (selected) resCallSelect.value = selected;
  }



  function renderMapMarkers() {
    if (!mapMarkerLayer) return;
    mapMarkerLayer.innerHTML = '';

    const rect = mapMarkerLayer.getBoundingClientRect();
    const width = rect.width || mapMarkerLayer.clientWidth;
    const height = rect.height || mapMarkerLayer.clientHeight;
    if (!width || !height) return;

    state.calls.forEach(call => {
      if (!call.marker) return;
      const x = call.marker.x * width;
      const y = call.marker.y * height;

      const dot = document.createElement('div');
      dot.className = 'map-marker';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      mapMarkerLayer.appendChild(dot);
    });
  }

  if (mapClickLayer) {
    mapClickLayer.addEventListener('click', (e) => {
      if (!markerPlacementCallId) return;

      const rect = mapClickLayer.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const call = state.calls.find(c => c.id === markerPlacementCallId);
      if (call) {
        call.marker = { x, y };
        saveState();
        renderMapMarkers();
      }

      markerPlacementCallId = null;
      mapClickLayer.classList.remove('active');
    });
  }

  // Ресурсы
  resForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = resNameInput.value.trim();
    const app = resAppInput.value.trim();
    if (!name) {
      alert('Введите имя ресурса.');
      return;
    }

    const res = {
      id: state.nextResourceId++,
      name,
      app,
      status: resStatusSelect.value,
      callId: resCallSelect.value ? Number(resCallSelect.value) : null
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
    // очистим списки ресурсов у вызовов
    state.calls.forEach(c => c.resources = []);

    // привязываем ресурсы к вызовам
    state.resources.forEach(res => {
      if (res.callId) {
        const call = state.calls.find(c => c.id === res.callId);
        if (call) {
          call.resources.push(res.name);
        } else {
          res.callId = null;
        }
      }
    });

    resourcesTableBody.innerHTML = '';
    state.resources.forEach(res => {
      const callOptions = state.calls.map(call => `
        <option value="${call.id}"${res.callId === call.id ? ' selected' : ''}>
          #${call.id}: ${escapeHtml(call.street)}
        </option>
      `).join('');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(res.name)}</td>
        <td>${escapeHtml(res.app || '')}</td>
        <td>
          <select class="input-select input-select-sm resource-status" data-id="${res.id}">
            <option value="Свободен"${res.status === 'Свободен' ? ' selected' : ''}>Свободен</option>
            <option value="Занят"${res.status === 'Занят' ? ' selected' : ''}>Занят</option>
            <option value="Недоступен"${res.status === 'Недоступен' ? ' selected' : ''}>Недоступен</option>
          </select>
        </td>
        <td>
          <select class="input-select input-select-sm resource-call" data-id="${res.id}">
            <option value="">— Нет —</option>
            ${callOptions}
          </select>
        </td>
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

  resourcesTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === 'delete-resource') {
      if (!confirm('Удалить ресурс #' + id + '?')) return;
      state.resources = state.resources.filter(r => r.id !== id);
      saveState();
      renderResources();
      renderCalls();
    }

    if (action === 'edit-resource') {
      const res = state.resources.find(r => r.id === id);
      if (!res) return;

      const newName = prompt('Имя ресурса:', res.name);
      if (newName === null) return;
      const newApp = prompt('Приложение:', res.app || '');
      if (newApp === null) return;

      res.name = newName.trim() || res.name;
      res.app = newApp.trim();
      saveState();
      renderResources();
      renderCalls();
    }
  });

  resourcesTableBody.addEventListener('change', (e) => {
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
      const val = target.value;
      res.callId = val ? Number(val) : null;
      saveState();
      renderResources();
      renderCalls();
      renderCallsInResourceSelect();
    }
  });

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

  orientationTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const item = state.orientations.find(o => o.id === id);
    if (!item) return;

    if (action === 'toggle-orientation') {
      item.active = !item.active;
    } else if (action === 'delete-orientation') {
      if (!confirm('Удалить ориентировку?')) return;
      state.orientations = state.orientations.filter(o => o.id !== id);
    }
    saveState();
    renderOrientations();
  });

  // Заметки
  if (notesField) {
    notesField.value = state.notes || '';
    notesField.addEventListener('input', () => {
      state.notes = notesField.value;
      if (notesStatus) notesStatus.textContent = 'Сохранено';
      saveState();
      setTimeout(() => {
        if (notesStatus) notesStatus.textContent = 'Загружено';
      }, 600);
    });
  }

  // Кнопки генератора и истории
  const aiBtn = document.getElementById('ai-generate-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => {
      callDescInput.value = 'Сообщение: подозрительный объект возле подъезда';
      alert('Пример описания сгенерирован (фиктивно).');
    });
  }

  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      const finished = state.calls.filter(c => c.status === 'Завершён').length;
      alert('Завершённых вызовов: ' + finished);
    });
  }

  // Первичный рендер
  renderCalls();
  renderResources();
  renderOrientations();
  renderCallsInResourceSelect();
  updateActiveCallsCounter();
}



  // первичный рендер маркеров и подписка на resize
  renderMapMarkers();
  window.addEventListener('resize', renderMapMarkers);
// ==== ГРАЖДАНСКИЙ ====

function initCitizen() {
  const personsGrid = document.getElementById('persons-grid');
  const vehiclesGrid = document.getElementById('vehicles-grid');
  const personsCountSpan = document.getElementById('persons-count');
  const vehiclesCountSpan = document.getElementById('vehicles-count');
  const addPersonBtn = document.getElementById('add-person-btn');
  const addVehicleBtn = document.getElementById('add-vehicle-btn');

  const personModal = document.getElementById('person-modal');
  const personForm = document.getElementById('person-form');
  const personClose = document.getElementById('person-close');
  const personCancel = document.getElementById('person-cancel');
  const personLastNameInput = document.getElementById('person-lastname');
  const personFirstNameInput = document.getElementById('person-firstname');
  const personMiddleNameInput = document.getElementById('person-middlename');
  const personDobInput = document.getElementById('person-dob');
  const personFlagInput = document.getElementById('person-flag');

  const vehicleModal = document.getElementById('vehicle-modal');
  const vehicleForm = document.getElementById('vehicle-form');
  const vehicleClose = document.getElementById('vehicle-close');
  const vehicleCancel = document.getElementById('vehicle-cancel');
  const vehicleOwnerTypeInput = document.getElementById('vehicle-owner-type');
  const vehiclePersonSelect = document.getElementById('vehicle-person');
  const vehicleMakeInput = document.getElementById('vehicle-make');
  const vehicleModelInput = document.getElementById('vehicle-model');
  const vehicleYearInput = document.getElementById('vehicle-year');
  const vehicleColorInput = document.getElementById('vehicle-color');
  const vehiclePlateTypeSelect = document.getElementById('vehicle-plate-type');
  const vehiclePlateInput = document.getElementById('vehicle-plate');
  const vehicleVinInput = document.getElementById('vehicle-vin');
  const vehicleFlagInput = document.getElementById('vehicle-flag');

  const vehicleInfoModal = document.getElementById('vehicle-info-modal');
  const vehicleInfoTitle = document.getElementById('vehicle-info-title');
  const vehicleInfoBox = document.getElementById('vehicle-info-box');
  const vehicleInfoClose = document.getElementById('vehicle-info-close');
  const vehicleInfoOk = document.getElementById('vehicle-info-ok');

  if (!personsGrid || !vehiclesGrid) return;

  // Персонажи
  function openPersonModal() {
    personForm.reset();
    personModal.classList.remove('hidden');
  }
  function closePersonModal() {
    personModal.classList.add('hidden');
  }

  addPersonBtn.addEventListener('click', openPersonModal);
  personClose.addEventListener('click', closePersonModal);
  personCancel.addEventListener('click', closePersonModal);

  personForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const lastName = personLastNameInput.value.trim();
    const firstName = personFirstNameInput.value.trim();
    const middleName = personMiddleNameInput.value.trim();
    const dob = personDobInput.value;
    const flag = personFlagInput.value.trim();

    if (!lastName || !firstName || !dob) {
      alert('Заполните фамилию, имя и дату рождения.');
      return;
    }

    const person = {
      id: state.nextPersonId++,
      lastName,
      firstName,
      middleName,
      dob,
      flag
    };
    state.persons.push(person);
    saveState();
    renderPersons();
    closePersonModal();
  });

  function renderPersons() {
    personsGrid.innerHTML = '';
    const total = state.persons.length;
    personsCountSpan.textContent = `${total} / 32`;

    state.persons.forEach(p => {
      const card = document.createElement('div');
      card.className = 'person-card';

      const initials =
        (p.firstName ? p.firstName[0] : '?') +
        (p.lastName ? p.lastName[0] : '?');

      card.innerHTML = `
        <div class="person-photo-stub">${escapeHtml(initials)}</div>
        <div class="person-name">
          ${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}
        </div>
        <div class="person-dob">
          ${formatDob(p.dob)}
        </div>
        <div class="person-flags">
          ${p.flag ? '<span class="flag-label">Флаг</span>' : ''}
        </div>
      `;

      card.addEventListener('click', () => {
        const text = [
          `ФИО: ${p.lastName} ${p.firstName} ${p.middleName || ''}`.trim(),
          `Дата рождения: ${formatDob(p.dob)}`,
          p.flag ? `Флаг: ${p.flag}` : ''
        ].filter(Boolean).join('\n');
        alert(text);
      });

      personsGrid.appendChild(card);
    });

    // карточка добавления
    const addCard = document.createElement('div');
    addCard.className = 'person-card add-card';
    addCard.innerHTML = '<div class="add-card-icon">+</div><div>Добавить персонажа</div>';
    addCard.addEventListener('click', openPersonModal);
    personsGrid.appendChild(addCard);

    renderVehiclePersonsSelect();
  }

  function renderVehiclePersonsSelect() {
    vehiclePersonSelect.innerHTML = '';
    if (!state.persons.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Нет зарегистрированных персонажей';
      vehiclePersonSelect.appendChild(opt);
      return;
    }
    state.persons.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.lastName} ${p.firstName} ${p.middleName || ''}`.trim();
      vehiclePersonSelect.appendChild(opt);
    });
  }

  // Автомобили
  function openVehicleModal() {
    vehicleForm.reset();
    renderVehiclePersonsSelect();
    vehicleModal.classList.remove('hidden');
  }
  function closeVehicleModal() {
    vehicleModal.classList.add('hidden');
  }

  addVehicleBtn.addEventListener('click', () => {
    if (!state.persons.length) {
      alert('Сначала создайте хотя бы одного персонажа.');
      return;
    }
    openVehicleModal();
  });

  vehicleClose.addEventListener('click', closeVehicleModal);
  vehicleCancel.addEventListener('click', closeVehicleModal);

  vehicleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ownerType = vehicleOwnerTypeInput.value;
    const personId = Number(vehiclePersonSelect.value);
    const make = vehicleMakeInput.value.trim();
    const model = vehicleModelInput.value.trim();
    const year = vehicleYearInput.value.trim();
    const color = vehicleColorInput.value.trim();
    const plateType = vehiclePlateTypeSelect.value;
    const plate = vehiclePlateInput.value.trim();
    const vin = vehicleVinInput.value.trim();
    const flag = vehicleFlagInput.value.trim();

    if (!ownerType || !personId || !make || !model || !year || !color || !plateType || !plate) {
      alert('Заполните все обязательные поля.');
      return;
    }

    const vehicle = {
      id: state.nextVehicleId++,
      ownerType,
      personId,
      make,
      model,
      year,
      color,
      plateType,
      plate,
      vin,
      flag
    };
    state.vehicles.push(vehicle);
    saveState();
    renderVehicles();
    closeVehicleModal();
  });

  function renderVehicles() {
    vehiclesGrid.innerHTML = '';
    const total = state.vehicles.length;
    vehiclesCountSpan.textContent = `${total} / 64`;

    state.vehicles.forEach(v => {
      const card = document.createElement('div');
      card.className = 'vehicle-card';

      const owner = state.persons.find(p => p.id === v.personId);

      card.innerHTML = `
        <div class="vehicle-main">
          <div class="vehicle-make-model">
            ${escapeHtml(v.make)} ${escapeHtml(v.model)}
          </div>
          <div class="vehicle-plate">${escapeHtml(v.plate)}</div>
        </div>
        <div class="vehicle-owner">
          ${owner ? escapeHtml(owner.lastName + ' ' + owner.firstName) : 'Владелец не найден'}
        </div>
        <div class="vehicle-flags">
          ${v.flag ? '<span class="flag-label">Флаг</span>' : ''}
        </div>
      `;

      card.addEventListener('click', () => openVehicleInfoModal(v.id));
      vehiclesGrid.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.className = 'vehicle-card add-card';
    addCard.innerHTML = '<div class="add-card-icon">+</div><div>Добавить автомобиль</div>';
    addCard.addEventListener('click', () => {
      if (!state.persons.length) {
        alert('Сначала создайте хотя бы одного персонажа.');
      } else {
        openVehicleModal();
      }
    });
    vehiclesGrid.appendChild(addCard);
  }

  function openVehicleInfoModal(vehicleId) {
    const v = state.vehicles.find(x => x.id === vehicleId);
    if (!v) return;
    const owner = state.persons.find(p => p.id === v.personId);

    vehicleInfoTitle.textContent = `Информация об автомобиле: ${v.make} ${v.model}`;
    const ownerName = owner
      ? `${owner.lastName} ${owner.firstName} ${owner.middleName || ''}`.trim()
      : 'Неизвестен';
    const ownerDob = owner ? formatDob(owner.dob) : '—';

    vehicleInfoBox.innerHTML = `
      <p><strong>Марка:</strong> ${escapeHtml(v.make)}</p>
      <p><strong>Модель:</strong> ${escapeHtml(v.model)}</p>
      <p><strong>Год:</strong> ${escapeHtml(v.year)}</p>
      <p><strong>Цвет:</strong> ${escapeHtml(v.color)}</p>
      <p><strong>Тип номера:</strong> ${escapeHtml(v.plateType)}</p>
      <p><strong>Гос. номер:</strong> ${escapeHtml(v.plate)}</p>
      <p><strong>VIN:</strong> ${v.vin ? escapeHtml(v.vin) : '—'}</p>
      <p><strong>Владелец:</strong> ${escapeHtml(ownerName)}</p>
      <p><strong>Дата рождения владельца:</strong> ${ownerDob}</p>
      ${v.flag ? `<p><strong>Флаг:</strong> ${escapeHtml(v.flag)}</p>` : ''}
    `;

    vehicleInfoModal.classList.remove('hidden');
  }

  function closeVehicleInfoModal() {
    vehicleInfoModal.classList.add('hidden');
  }

  vehicleInfoClose.addEventListener('click', closeVehicleInfoModal);
  vehicleInfoOk.addEventListener('click', closeVehicleInfoModal);

  // Первичный рендер
  renderPersons();
  renderVehicles();
}

// Заглушки для других ролей
function initForces() {}
function initRescue() {}
