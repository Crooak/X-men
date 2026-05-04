let _allVisits = [];
let _allTrainings = [];
let _allOrders = [];
let _allSchedule = [];
let _allTrainerClients = [];
let _allManagerClients = [];
let _allManagerTrainings = [];
let _allProducts = [];
let _allUsers = [];
let _allSettings = [];
let _allLogs = [];

let selectedGuestClient = null;
let _allServices = []; // для хранения всех услуг (включая неактивные)
let _trainerSpecialization = '';
let _trainerClientNotes = {};
let _trainerGroupSessions = [];
let _trainerDailySessions = [];
let _selectedDate = new Date().toISOString().split('T')[0];

let _groupTypes = [];
let _selectedGroupType = 'all';

let _trainerSpecializations = [];
let _allSpecializations = [];

let _clientSchedule = [];
let _selectedClientDate = new Date().toISOString().split('T')[0];

let _uniqueTrainingDates = [];

let _myTrainers = [];

let _activeSubscriptionEnd = null;

let _trainersList = [];
let _groupTrainingNames = [];

async function renderProfile(user) {
    const container = document.getElementById('profileContainer');
    if (!container) return;

    // Загрузка данных в зависимости от роли
   if (user.role === 'Клиент') {
    _allVisits = await fetchClientVisits(user.id);
    _allTrainings = await fetchClientTrainings(user.id);
    _allOrders = await fetchClientAllOrders(user.id);
    _allSpecializations = await fetchAllSpecializations();
    _clientSchedule = _allTrainings
        .filter(t => t.status === 'подтверждено')
        .map(t => ({ ...t }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    _selectedClientDate = new Date().toISOString().split('T')[0];
    _uniqueTrainingDates = [...new Set(_allTrainings.map(t => t.date.split(' ')[0]))].sort();
    _myTrainers = await fetchMyTrainers(user.id);

    // Информация об активном абонементе
    const subRes = await fetch(`${API_URL}/client/${user.id}/active-subscription`);
    if (subRes.ok) {
        const subData = await subRes.json();
        user.hasActive = subData.hasActive;
        if (subData.hasActive) {
            user.subscriptionEnd = subData.end_date;
            user.subscriptionName = subData.name;
        } else {
            user.subscriptionEnd = null;
            user.subscriptionName = null;
        }
    } else {
        user.hasActive = false;
        user.subscriptionEnd = null;
        user.subscriptionName = null;
    }

    // Получаем активный гостевой код
    const guestCode = await fetchActiveGuestCode(user.id);
    user.guestCode = guestCode;
}
    else if (user.role === 'Тренер') {
        // Основные данные тренера
        const trainerData = await fetchTrainerById(user.id);
    if (trainerData) {
        user.specialization = trainerData.specialization;
        user.rating = trainerData.rating;
        user.bio = trainerData.bio;
        _trainerSpecialization = user.specialization;
    }
        // Специализация
        const trainerSpecsRes = await fetch(`${API_URL}/trainer/${user.id}/specializations`);
    if (trainerSpecsRes.ok) {
        _trainerSpecializations = await trainerSpecsRes.json();
    }
    // Загружаем все доступные специализации
    _allSpecializations = await fetchAllSpecializations();
        // Заметки о клиентах
        const notesRes = await fetch(`${API_URL}/trainer/${user.id}/client-notes`);
        if (notesRes.ok) {
            _trainerClientNotes = await notesRes.json();
        }
        // Расписание тренера (сегодня)
        _allSchedule = await fetchTrainerSchedule(user.id);
        // Клиенты тренера
        _allTrainerClients = await fetchTrainerClients(user.id);
        // Групповые тренировки (ближайшие 30 дней)
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        const sessionsRes = await fetch(`${API_URL}/trainer/${user.id}/group-sessions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
        if (sessionsRes.ok) {
            _trainerGroupSessions = await sessionsRes.json();
        }
        const groupTypesRes = await fetch(`${API_URL}/trainer/${user.id}/group-types`);
        if (groupTypesRes.ok) {
            _groupTypes = await groupTypesRes.json();
        }
        // Занятость на сегодня
        const today = new Date().toISOString().split('T')[0];
        const availRes = await fetch(`${API_URL}/trainer/${user.id}/availability?date=${today}`);
        if (availRes.ok) {
            _trainerDailySessions = await availRes.json();
        }
        _selectedDate = today;
    } 
    
    else if (user.role === 'Менеджер') {
    _allManagerClients = await fetchAllClients();
    _allManagerTrainings = await fetchAllTrainings();
    _allProducts = await fetchProducts();
    _trainersList = await fetchTrainersList();
    _groupTrainingNames = await fetchGroupTrainingNames();
    _allServices = await fetchAllSubscriptions();
}
 else if (user.role === 'Администратор') {
        _allUsers = await fetchAllUsers();
        _allProducts = await fetchProducts();
        _allSettings = await fetchSystemSettings();
        _allLogs = await fetchSystemLogs();
        _allServices = await fetchAllSubscriptions();
    }

    const navItems = getNavItems(user.role);

    // Начало построения HTML
    let html = `
    <div class="profile-card">
        <div class="profile-layout">
            <div class="profile-left">
                <div class="profile-name-row" style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
    ${user.role === 'Тренер' ? `
        <div class="profile-photo-small">
            <img src="${user.photo || 'https://via.placeholder.com/60'}" alt="Фото тренера" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid var(--accent);">
        </div>
    ` : ''}
    <div>
        <span class="profile-name">${escapeHtml(user.name)}</span>
<span class="profile-role">${escapeHtml(getRoleNameShort(user.role))}</span>
    </div>
</div>
                <div class="profile-info-items">
`;
    // Информационные блоки в зависимости от роли
    if (user.role === 'Клиент') {
        const endDateStr = user.subscriptionEnd ? new Date(user.subscriptionEnd).toLocaleDateString('ru-RU') : '';
html += `
    <div class="profile-info-item">
        <strong>Текущий абонемент</strong>
${user.hasActive 
    ? `<div><span>${escapeHtml(user.subscriptionName)}</span></div>
       <div><span>до ${endDateStr}</span></div>`
    : '<span>Нет активного абонемента</span>'}
    </div>
    <div class="profile-info-item">
        <strong>Код доступа</strong>
        <span>${user.id === 5 ? '123789 (истек)' : '123456 (действует до 10.03.2026)'}</span>
    </div>
    <div class="profile-info-item">
        <strong>Face ID</strong>
        <span><button class="btn btn-sm" onclick="uploadPhoto()">Загрузить фото</button></span>
    </div>
    <div class="profile-info-item">
    <strong>Гостевой код доступа</strong>
    <span>${user.guestCode ? user.guestCode : 'Нет активного кода'}</span>
    ${user.guestCode ? `<button class="btn btn-sm" onclick="copyToClipboard('${user.guestCode}')">Копировать</button>` : ''}
</div>
`;
    }  else if (user.role === 'Тренер') {
    html += `
        <div class="profile-info-grid">
            <div class="profile-info-item" id="specializations-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>Специализации</strong>
                    <button class="btn btn-sm" onclick="editTrainerSpecializations()">✎</button>
                </div>
               <span>${escapeHtml(_trainerSpecializations.map(s => s.name).join(', ') || 'Не указаны')}</span>
            </div>
            <div class="profile-info-item" id="rating-item">
                <strong>Рейтинг</strong>
                <span>${user.rating || '0.0'}</span>
            </div>
            <div class="profile-bio" id="bio-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>О себе</strong>
                    <button class="btn btn-sm" onclick="editBio()">✎</button>
                </div>
                <p>${escapeHtml(user.bio || 'Пока нет описания')}</p>
            </div>
        </div>
    `;
} else if (user.role === 'Администратор') {
        html += `
            <div class="profile-info-item">
                <strong>Всего пользователей</strong>
                <span>${_allUsers.length}</span>
            </div>
            <div class="profile-info-item">
                <strong>Активных клиентов</strong>
                <span>${_allUsers.filter(u => u.role === 'Клиент' && u.is_active).length}</span>
            </div>
            <div class="profile-info-item">
    <strong>Посещений сайта сегодня</strong>
    <span id="todayVisitsCount">Загрузка...</span>
</div>
        `;
    } else if (user.role === 'Менеджер') {
    html += `
        <div class="profile-info-item">
            <strong>Активных клиентов</strong>
            <span id="managerActiveCount">${_allManagerClients.filter(c => c.activity_status === 'active').length}</span>
        </div>
        <div class="profile-info-item">
            <strong>Всего клиентов</strong>
            <span id="managerTotalCount">${_allManagerClients.length}</span>
        </div>
    `;
}
    html += `</div>`; // закрываем profile-info-items
html += `<div style="margin-top: 20px;"><button class="btn btn-sm" onclick="editProfile()">✎ Редактировать профиль</button></div>`;
html += `</div>`; // закрываем profile-left

    // Правая панель навигации
    html += `
                <div class="profile-right">
                    ${navItems.map(item => `
                        <button class="btn ${item.id === 'logout' ? 'btn-logout' : ''}" onclick="scrollToSection('${item.id}')">${item.label}</button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Добавление секций в зависимости от роли с правильным await
    try {
        if (user.role === 'Клиент') {
            html += await renderClientSections();
        } else if (user.role === 'Тренер') {
            html += await renderTrainerSections();
        } else if (user.role === 'Менеджер') {
            html += await renderManagerSections();
        } else if (user.role === 'Администратор') {
            html += await renderAdminSections();
        }
    } catch (e) {
        console.error('Ошибка при рендеринге секций', e);
        html += '<p>Ошибка загрузки данных</p>';
    }

    container.innerHTML = html;

    // После вставки HTML вызываем функции инициализации для каждой роли
    if (user.role === 'Администратор') {
        // Обновляем данные для администратора (на случай, если они не были загружены)
        _allServices = await fetchAllSubscriptions();
        _allProducts = await fetchProducts();
        _allUsers = await fetchAllUsers();
        refreshAdminUsers();
        filterAdminServices();
        filterAdminProducts();
        refreshAdminSettings();
        filterAdminLogs();
        loadBackupsList();
        loadTodayVisits();
    }

    if (user.role === 'Менеджер') {
        // Даем DOM время обновиться, затем обновляем таблицы
        setTimeout(() => {
            refreshManagerTrainings();
            refreshManagerServices();
        }, 0);
    }

    addScrollToTopButton();
}


async function performImageUploadForModal(fileInputId, previewImgId) {
    const fileInput = document.getElementById(fileInputId);
    const file = fileInput.files[0];
    if (!file) return null;
    // Предпросмотр
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById(previewImgId);
        if (preview) {
            preview.src = e.target.result;
            const previewContainer = document.getElementById(previewImgId.replace('Img', ''));
            if (previewContainer) previewContainer.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
    // Загрузка на сервер
    try {
        const url = await uploadImage(file);
        return url;
    } catch (err) {
        alert('Ошибка загрузки: ' + err.message);
        return null;
    }
}


window.editProfile = function() {
    const user = getCurrentUser();
    const isTrainer = user.role === 'Тренер';
    
    let photoHtml = '';
    if (isTrainer) {
        photoHtml = `<div class="form-group"><label>Фото профиля</label><div id="profileImageUploader"></div></div>`;
    } else {
        photoHtml = `<input type="hidden" id="editPhotoUrl" value="${user.photo || ''}">`;
    }
    
    const content = `
        <form id="editProfileForm">
            <div class="form-group">
                <label>ФИО</label>
                <input type="text" id="editFullName" value="${escapeHtml(user.name)}" required pattern="[А-Яа-яA-Za-z\\s-]+" title="Только буквы, пробел и дефис">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editEmail" value="${escapeHtml(user.email)}" required>
            </div>
            <div class="form-group">
                <label>Телефон</label>
                <input type="tel" id="editPhone" value="${escapeHtml(user.phone)}" required placeholder="+7 (999) 999-99-99">
            </div>
            ${photoHtml}
            <div class="form-group">
                <label>Новый пароль (оставьте пустым, если не хотите менять)</label>
                <input type="password" id="editNewPassword" placeholder="Новый пароль">
            </div>
            <div class="form-group">
                <label>Подтверждение нового пароля</label>
                <input type="password" id="editNewPasswordConfirm" placeholder="Повторите новый пароль">
            </div>
            <div class="form-group" id="currentPasswordGroup" style="display:none;">
                <label>Текущий пароль (для подтверждения изменений)</label>
                <input type="password" id="editCurrentPassword" required>
            </div>
        </form>
    `;

    openModal('Редактирование профиля', content, async () => {
        let photoUrl = document.getElementById('editPhotoUrl')?.value || '';
        if (isTrainer) {
            // URL уже лежит в поле, которое создал initImageUploader
            photoUrl = document.getElementById('editPhotoUrl')?.value || '';
        }
        
        const newName = document.getElementById('editFullName').value;
        const newEmail = document.getElementById('editEmail').value;
        const newPhoneRaw = document.getElementById('editPhone').value;
        const newPass = document.getElementById('editNewPassword').value;
        const newPassConfirm = document.getElementById('editNewPasswordConfirm').value;
        const currentPass = document.getElementById('editCurrentPassword').value;
        
        const nameRegex = /^[А-Яа-яA-Za-z\s-]+$/;
        if (!nameRegex.test(newName)) { alert('ФИО может содержать только буквы, пробел и дефис'); return; }
        if (!newEmail.includes('@') || !newEmail.includes('.')) { alert('Введите корректный email'); return; }
        const phoneDigits = newPhoneRaw.replace(/\D/g, '');
        if (phoneDigits.length !== 11 && phoneDigits.length !== 10) { alert('Введите корректный номер телефона'); return; }
        const normalizedPhone = phoneDigits.length === 11 ? phoneDigits : '7' + phoneDigits;
        
        if (newPass || newPassConfirm) {
            if (newPass !== newPassConfirm) { alert('Новый пароль и подтверждение не совпадают'); return; }
            if (newPass.length < 4) { alert('Пароль должен быть не менее 4 символов'); return; }
            if (!currentPass) { alert('Введите текущий пароль'); return; }
        }
        
        const data = { full_name: newName, email: newEmail, phone: normalizedPhone, photo_url: photoUrl };
        if (newPass) { data.newPassword = newPass; data.currentPassword = currentPass; }
        
        const result = await updateUserData(user.id, data);
        if (!result.success) { alert(result.error || 'Ошибка обновления'); return; }
        
        user.name = result.user.full_name;
        user.email = result.user.email;
        user.phone = result.user.phone;
        user.photo = result.user.photo_url;
        setCurrentUser(user);
        if (typeof updateHeader === 'function') updateHeader();
        alert('Данные обновлены');
        closeModal();
        renderProfile(user);
    });
    
    // Маска телефона и управление полем пароля
    setTimeout(() => {
        const phoneInput = document.getElementById('editPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value[0] === '7' || value[0] === '8') value = value.substring(1);
                    const match = value.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
                    if (match) {
                        let formatted = '';
                        if (match[1]) formatted = `+7 (${match[1]}`;
                        if (match[2]) formatted += `) ${match[2]}`;
                        if (match[3]) formatted += `-${match[3]}`;
                        if (match[4]) formatted += `-${match[4]}`;
                        e.target.value = formatted;
                    }
                }
            });
        }
        const newPassInput = document.getElementById('editNewPassword');
        const newPassConfirmInput = document.getElementById('editNewPasswordConfirm');
        const currentPassGroup = document.getElementById('currentPasswordGroup');
        if (newPassInput && newPassConfirmInput && currentPassGroup) {
            const toggleCurrentPass = () => {
                if (newPassInput.value || newPassConfirmInput.value) {
                    currentPassGroup.style.display = 'block';
                    document.getElementById('editCurrentPassword').required = true;
                } else {
                    currentPassGroup.style.display = 'none';
                    document.getElementById('editCurrentPassword').required = false;
                }
            };
            newPassInput.addEventListener('input', toggleCurrentPass);
            newPassConfirmInput.addEventListener('input', toggleCurrentPass);
        }
        
        if (isTrainer) {
            // Инициализируем загрузчик фото с текущим URL
            initImageUploader('profileImageUploader', 'editPhotoUrl', 'profilePhotoPreview', user.photo || '');
        }
    }, 200);
};

window.editTrainerSpecializations = async function() {
    const user = getCurrentUser();
    const allSpecs = await fetchAllSpecializations();
    const trainerSpecsRes = await fetch(`${API_URL}/trainer/${user.id}/specializations`);
    const trainerSpecs = trainerSpecsRes.ok ? await trainerSpecsRes.json() : [];
    const trainerSpecIds = trainerSpecs.map(s => s.id);

    const checkboxes = allSpecs.map(s => `
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
            <label style="display: flex; align-items: flex-start; gap: 8px;">
                <input type="checkbox" value="${s.id}" ${trainerSpecIds.includes(s.id) ? 'checked' : ''} style="margin-top: 3px;">
                <div>
                    <div style="font-weight: 500;">${s.name}</div>
                    ${s.description ? `<div style="font-size: 0.9em; color: #666;">${s.description}</div>` : ''}
                </div>
            </label>
        </div>
    `).join('');

    const content = `
        <form id="editSpecForm" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
            ${checkboxes || '<p>Нет доступных специализаций</p>'}
        </form>
    `;
    openModal('Редактирование специализаций', content, async () => {
        const checkboxes = document.querySelectorAll('#editSpecForm input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const res = await fetch(`${API_URL}/trainer/${user.id}/specializations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ specializationIds: selectedIds })
        });
        if (res.ok) {
            alert('Специализации обновлены');
            const updatedRes = await fetch(`${API_URL}/trainer/${user.id}/specializations`);
            if (updatedRes.ok) {
                _trainerSpecializations = await updatedRes.json();
                const span = document.querySelector('#specializations-item span');
                if (span) span.innerText = _trainerSpecializations.map(s => s.name).join(', ') || 'Не указаны';
            }
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

function getRoleNameShort(role) {
    const roles = { 'Клиент': 'Клиент', 'Тренер': 'Тренер', 'Менеджер': 'Менеджер', 'Администратор': 'Администратор' };
    return roles[role] || role;
}

function getNavItems(role) {
    const items = {
        'Клиент': [
            { id: 'client-schedule', label: 'Моё расписание' },
            { id: 'visits', label: 'История посещений' },
            { id: 'trainings', label: 'Мои тренировки' },
            { id: 'my-trainers', label: 'Мои тренеры' }, 
            { id: 'orders', label: 'Мои заказы' },
            { id: 'logout', label: 'Выйти' }
        ],
        'Тренер': [
            { id: 'schedule', label: 'Моё расписание' },
            { id: 'gym-schedule', label: 'Расписание в тренажёрном зале' },
            { id: 'group-schedule', label: 'Расписание в групповых залах' },
            { id: 'clients', label: 'Мои клиенты' },
            { id: 'logout', label: 'Выйти' }
        ],
        'Менеджер': [
    { id: 'manage-clients', label: 'Управление клиентами' },
    { id: 'manage-schedule', label: 'Управление расписанием' },
    { id: 'manage-products', label: 'Управление товарами' },
    { id: 'manage-services', label: 'Управление услугами' },
    { id: 'manage-specializations', label: 'Управление специализациями' },
    { id: 'guest-code', label: 'Генерация гостевого кода' },
    { id: 'logout', label: 'Выйти' }
],
        'Администратор': [
    { id: 'manage-users', label: 'Управление пользователями' },
    { id: 'manage-products', label: 'Управление товарами' },
    { id: 'manage-services', label: 'Управление услугами' },
    { id: 'manage-specializations', label: 'Управление специализациями' },
    { id: 'settings', label: 'Настройки системы' },
    { id: 'logs', label: 'Просмотр логов' },
    { id: 'backup', label: 'Резервное копирование' },
    { id: 'report', label: 'Отчетность' },
    { id: 'logout', label: 'Выйти' }
]
    };
    return items[role] || [];
}

function scrollToSection(sectionId) {
    if (sectionId === 'logout') {
        logout();
        return;
    }
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
}

function addScrollToTopButton() {
    const existing = document.getElementById('scrollToTop');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.id = 'scrollToTop';
    btn.className = 'scroll-to-top';
    btn.innerHTML = '↑';
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    btn.style.position = 'fixed';
    btn.style.bottom = '30px';
    btn.style.right = '30px';
    btn.style.width = '50px';
    btn.style.height = '50px';
    btn.style.borderRadius = '50%';
    btn.style.background = 'linear-gradient(135deg, #3498db, #8e44ad)';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.display = 'none';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.fontSize = '24px';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    btn.style.zIndex = '9999';
    btn.style.transition = 'all 0.3s ease';

    document.body.insertBefore(btn, document.body.firstChild);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
            btn.style.display = 'flex';
        } else {
            btn.classList.remove('visible');
            btn.style.display = 'none';
        }
    });
}

function openModal(title, contentHtml, onConfirm) {
    const modal = document.getElementById('genericModal');
    if (modal) modal.remove();
    const confirmButton = onConfirm ? `<button class="btn" onclick="confirmModal()">Подтвердить</button>` : '';
    const modalHTML = `
        <div id="genericModal" class="modal">
            <div class="modal-content">
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <h3>${title}</h3>
                <div id="modalBody">${contentHtml}</div>
                ${confirmButton}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.modalOnConfirm = onConfirm;
    document.getElementById('genericModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('genericModal').style.display = 'none';
}

function confirmModal() {
    if (window.modalOnConfirm) window.modalOnConfirm();
    closeModal();
}

window.prevDay = function() {
    const date = new Date(_selectedDate);
    date.setDate(date.getDate() - 1);
    _selectedDate = date.toISOString().split('T')[0];
    document.getElementById('currentDateDisplay').innerText = _selectedDate.replace(/-/g, ' ');
    filterTrainerScheduleByDate();
};

window.nextDay = function() {
    const date = new Date(_selectedDate);
    date.setDate(date.getDate() + 1);
    _selectedDate = date.toISOString().split('T')[0];
    document.getElementById('currentDateDisplay').innerText = _selectedDate.replace(/-/g, ' ');
    filterTrainerScheduleByDate();
};

function filterTrainerScheduleByDate() {
    const filtered = _allSchedule.filter(s => s.date.split(' ')[0] === _selectedDate);
    document.getElementById('trainerScheduleTable').innerHTML = buildTrainerScheduleTable(filtered);
}

window.prevGymDay = function() {
    const date = new Date(_selectedDate);
    date.setDate(date.getDate() - 1);
    _selectedDate = date.toISOString().split('T')[0];
    document.getElementById('gymCurrentDateDisplay').innerText = _selectedDate.replace(/-/g, ' ');
    refreshGymSchedule();
};

window.nextGymDay = function() {
    const date = new Date(_selectedDate);
    date.setDate(date.getDate() + 1);
    _selectedDate = date.toISOString().split('T')[0];
    document.getElementById('gymCurrentDateDisplay').innerText = _selectedDate.replace(/-/g, ' ');
    refreshGymSchedule();
};

async function refreshGymSchedule() {
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions?date=${_selectedDate}`);
    if (res.ok) {
        _trainerDailySessions = await res.json();
        const tableContainer = document.getElementById('trainerGymScheduleTable');
        if (tableContainer) {
            tableContainer.innerHTML = await buildTrainerGymScheduleTable(_selectedDate);
        }
    }
}

async function loadGroupSessions() {
    const user = getCurrentUser();
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    let url = `${API_URL}/trainer/${user.id}/group-sessions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    if (_selectedGroupType && _selectedGroupType !== 'all') {
        url += `&groupTypeId=${_selectedGroupType}`;
    }
    const sessionsRes = await fetch(url);
    if (sessionsRes.ok) {
        _trainerGroupSessions = await sessionsRes.json();
        const container = document.getElementById('trainerGroupSessionsTable');
        if (container) {
            container.innerHTML = buildTrainerGroupSessionsTable(_trainerGroupSessions);
        }
    }
}

function buildTrainerGroupSessionsTable(sessions) {
    if (!sessions.length) return '<p>Нет групповых тренировок</p>';
    return `
        <table>
            <thead>
                <tr>
                    <th>Группа</th>
                    <th>Название</th>
                    <th>Дата и время</th>
                    <th>Зал</th>
                    <th>Макс. участников</th>
                    <th>Записано</th>
                    <th>Цена</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${sessions.map(s => {
                    const start = new Date(s.start_time);
                    const formatted = start.toLocaleString('ru-RU', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                    }).replace(/\./g, ' ');
                    const group = _groupTypes.find(g => g.id === s.group_type_id);
                    return `
                        <tr>
                            <td>${group ? group.name : '—'}</td>
                            <td>${s.name}</td>
                            <td>${formatted}</td>
                            <td>${s.room}</td>
                            <td>${s.max_participants}</td>
                            <td>${s.booked}</td>
                            <td>${s.price ? s.price + ' ₽' : '—'}</td>
                            <td>
                                <button class="btn btn-sm" onclick="editGroupSession(${s.id})">✎</button>
                                <button class="btn btn-sm" onclick="deleteGroupSession(${s.id})">🗑</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function buildTrainerGymScheduleTable(date) {
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions?date=${date}`);
    if (!res.ok) return '<p>Ошибка загрузки</p>';
    const sessions = await res.json();
    if (!sessions.length) return '<p>Нет тренировок на этот день</p>';

    return `
        <table>
            <thead>
                <tr>
                    <th>Время</th>
                    <th>Статус</th>
                    <th>Клиент</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${sessions.map(s => {
                    const start = new Date(s.start_time);
                    const end = new Date(s.end_time);
                    const timeStr = `${start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
                    const booked = s.booked > 0;
                    const clientNames = s.clients ? s.clients.map(c => c.name).join(', ') : '';
                    return `
                        <tr>
                            <td>${timeStr}</td>
                            <td>${booked ? '<span class="status-badge status-active">Занято</span>' : '<span class="status-badge status-pending">Свободно</span>'}</td>
                            <td>${clientNames}</td>
                            <td>
                                ${!booked ? `<button class="btn btn-sm" onclick="editPersonalSession(${s.id})">✎</button>` : ''}
                                ${!booked ? `<button class="btn btn-sm" onclick="deletePersonalSlot(${s.id}, event)">🗑</button>` : ''}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

window.editBio = function() {
    const user = getCurrentUser();
    const content = `
        <form id="editBioForm">
            <div class="form-group">
                <label>Описание</label>
                <textarea id="bio" rows="5">${user.bio || ''}</textarea>
            </div>
        </form>
    `;
    openModal('Редактирование описания', content, async () => {
        const bio = document.getElementById('bio').value;
        const res = await fetch(`${API_URL}/trainer/${user.id}/bio`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio })
        });
        if (res.ok) {
            alert('Описание обновлено');
            user.bio = bio;
            const bioElement = document.querySelector('.profile-bio p');
            if (bioElement) bioElement.innerText = bio || 'Пока нет описания';
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.editPersonalSession = async function(sessionId) {
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions?date=${_selectedDate}`);
    const sessions = await res.json();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return alert('Слот не найден');
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const startStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const content = `
        <form id="editPersonalSessionForm">
            <div class="form-group">
                <label>Время начала</label>
                <input type="time" id="slotStart" value="${startStr}" required>
            </div>
            <div class="form-group">
                <label>Время окончания</label>
                <input type="time" id="slotEnd" value="${endStr}" required>
            </div>
        </form>
    `;
    openModal('Редактирование слота', content, async () => {
        const newStart = document.getElementById('slotStart').value;
        const newEnd = document.getElementById('slotEnd').value;
        if (!newStart || !newEnd) return alert('Заполните время');
        const startDateTime = new Date(_selectedDate + 'T' + newStart);
        const endDateTime = new Date(_selectedDate + 'T' + newEnd);
        if (endDateTime <= startDateTime) return alert('Время окончания должно быть позже начала');
        const updateRes = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString()
            })
        });
        if (updateRes.ok) {
            alert('Слот обновлён');
            refreshGymSchedule();
            closeModal();
        } else {
            alert('Ошибка');
        }
    });
};

window.editSpecialization = function() {
    const user = getCurrentUser();
    const content = `
        <form id="editSpecForm">
            <div class="form-group">
                <label>Специализация</label>
                <input type="text" id="specialization" value="${_trainerSpecialization}" required>
            </div>
        </form>
    `;
    openModal('Редактирование специализации', content, async () => {
        const newSpec = document.getElementById('specialization').value;
        const res = await fetch(`${API_URL}/trainer/${user.id}/specialization`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ specialization: newSpec })
        });
        if (res.ok) {
            alert('Специализация обновлена');
            _trainerSpecialization = newSpec;
            const specSpan = document.querySelector('#specialization-item span');
            if (specSpan) specSpan.innerText = newSpec || 'Не указана';
            closeModal();
        } else {
            alert('Ошибка');
        }
    });
};

window.editClientNote = function(clientId, clientName) {
    const user = getCurrentUser();
    const currentNote = _trainerClientNotes[clientId] || '';
    const content = `
        <form id="editClientNoteForm">
            <div class="form-group">
                <label>Заметка о клиенте ${clientName}</label>
                <textarea id="clientNote" rows="4">${currentNote}</textarea>
            </div>
        </form>
    `;
    openModal('Заметка о клиенте', content, async () => {
        const note = document.getElementById('clientNote').value;
        const res = await fetch(`${API_URL}/trainer/${user.id}/client-notes/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note })
        });
        if (res.ok) {
            alert('Заметка сохранена');
            _trainerClientNotes[clientId] = note;
            filterTrainerClients();
        } else {
            alert('Ошибка');
        }
    });
};

window.viewClientContact = async function(clientId) {
    const client = _allTrainerClients.find(c => c.id === clientId);
    if (!client) return;
    const res = await fetch(`${API_URL}/users/${clientId}`);
    if (!res.ok) {
        alert('Не удалось загрузить данные клиента');
        return;
    }
    const fullClient = await res.json();
    const content = `
        <div style="margin-bottom: 30px;">
            <p><strong>ФИО:</strong> ${fullClient.full_name}</p>
            <p><strong>Телефон:</strong> ${fullClient.phone}</p>
            <p><strong>Email:</strong> ${fullClient.email}</p>
        </div>
    `;
    openModal('Контакты клиента', content, null);
};

window.addGroupSession = function() {
    const user = getCurrentUser();
    const groupOptions = _groupTypes.map(gt => `<option value="${gt.id}" ${_selectedGroupType === gt.id.toString() ? 'selected' : ''}>${gt.name}</option>`).join('');
    const content = `
        <form id="addGroupSessionForm">
            <div class="form-group">
                <label>Группа</label>
                <select id="sessionGroupType" required>${groupOptions}</select>
            </div>
            <div class="form-group">
                <label>Название (можно изменить)</label>
                <input type="text" id="sessionName" placeholder="Оставить пустым для использования названия группы">
            </div>
            <div class="form-group">
                <label>Дата и время начала</label>
                <input type="datetime-local" id="sessionStart" required>
            </div>
            <div class="form-group">
                <label>Длительность (минут)</label>
                <input type="number" id="sessionDuration" value="60" min="15" step="15">
            </div>
            <div class="form-group">
                <label>Зал</label>
                <input type="text" id="sessionRoom" value="Зал 1">
            </div>
            <div class="form-group">
                <label>Максимум участников</label>
                <input type="number" id="sessionMax" value="10" min="1">
            </div>
            <div class="form-group">
                <label>Цена (₽)</label>
                <input type="number" id="sessionPrice" value="500" min="0" step="10">
            </div>
        </form>
    `;
    openModal('Добавление групповой тренировки', content, async () => {
        const groupTypeId = parseInt(document.getElementById('sessionGroupType').value);
        const customName = document.getElementById('sessionName').value;
        const start = document.getElementById('sessionStart').value;
        const duration = parseInt(document.getElementById('sessionDuration').value);
        const room = document.getElementById('sessionRoom').value;
        const max = parseInt(document.getElementById('sessionMax').value);
        const price = parseInt(document.getElementById('sessionPrice').value);
        if (!groupTypeId || !start) return alert('Заполните обязательные поля');
        const startDate = new Date(start);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        const group = _groupTypes.find(g => g.id === groupTypeId);
        const name = customName || (group ? group.name : 'Групповая тренировка');
        const res = await fetch(`${API_URL}/trainer/${user.id}/group-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                max_participants: max,
                room,
                group_type_id: groupTypeId,
                price
            })
        });
        if (res.ok) {
            alert('Тренировка добавлена');
            await loadGroupSessions();
            await refreshTrainerSchedule(); 
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.editGroupSession = async function(sessionId) {
    const user = getCurrentUser();
    const session = _trainerGroupSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Загружаем полные данные тренировки
    const sessionRes = await fetch(`${API_URL}/trainings/${sessionId}`);
    if (!sessionRes.ok) return alert('Не удалось загрузить данные сессии');
    const fullSession = await sessionRes.json();
    
    const startUTC = new Date(fullSession.start_time);
    const endUTC = new Date(fullSession.end_time);
    const duration = (endUTC - startUTC) / 60000;
    
    // Преобразуем UTC в локальное время для datetime-local
    const year = startUTC.getFullYear();
    const month = String(startUTC.getMonth() + 1).padStart(2, '0');
    const day = String(startUTC.getDate()).padStart(2, '0');
    const hours = String(startUTC.getHours()).padStart(2, '0');
    const minutes = String(startUTC.getMinutes()).padStart(2, '0');
    const startLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    const groupOptions = _groupTypes.map(gt => `<option value="${gt.id}" ${fullSession.group_type_id === gt.id ? 'selected' : ''}>${gt.name}</option>`).join('');
    
    const content = `
        <form id="editGroupSessionForm">
            <div class="form-group">
                <label>Группа</label>
                <select id="sessionGroupType" required>${groupOptions}</select>
            </div>
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="sessionName" value="${fullSession.name}" required>
            </div>
            <div class="form-group">
                <label>Дата и время начала</label>
                <input type="datetime-local" id="sessionStart" value="${startLocal}" required>
            </div>
            <div class="form-group">
                <label>Длительность (минут)</label>
                <input type="number" id="sessionDuration" value="${duration}" min="15" step="15">
            </div>
            <div class="form-group">
                <label>Зал</label>
                <input type="text" id="sessionRoom" value="${fullSession.room || ''}">
            </div>
            <div class="form-group">
                <label>Максимум участников</label>
                <input type="number" id="sessionMax" value="${fullSession.max_participants}" min="1">
            </div>
            <div class="form-group">
                <label>Цена (₽)</label>
                <input type="number" id="sessionPrice" value="${fullSession.price || 500}" min="0" step="10">
            </div>
        </form>
    `;
    openModal('Редактирование групповой тренировки', content, async () => {
        const groupTypeId = parseInt(document.getElementById('sessionGroupType').value);
        const name = document.getElementById('sessionName').value;
        const start = document.getElementById('sessionStart').value;
        const duration = parseInt(document.getElementById('sessionDuration').value);
        const room = document.getElementById('sessionRoom').value;
        const max = parseInt(document.getElementById('sessionMax').value);
        const price = parseInt(document.getElementById('sessionPrice').value);
        if (!groupTypeId || !name || !start) return alert('Заполните все поля');
        
        const startDate = new Date(start);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        const res = await fetch(`${API_URL}/trainings/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                max_participants: max,
                room,
                group_type_id: groupTypeId,
                price,
                type: 'групповая'
            })
        });
        if (res.ok) {
            alert('Тренировка обновлена');
            await loadGroupSessions();       // обновляем список групповых
            await refreshTrainerSchedule();  // обновляем основное расписание
            closeModal();   
        } else {
            const err = await res.json();
            alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
        }
    });
};

window.deleteGroupSession = async function(sessionId) {
    if (!confirm('Удалить тренировку?')) return;
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/group-sessions/${sessionId}`, {
        method: 'DELETE'
    });
    if (res.ok) {
        alert('Тренировка удалена');
        await loadGroupSessions();
    } else {
        alert('Ошибка');
    }
};

window.editGymAvailability = function() {
    const user = getCurrentUser();
    const date = _selectedDate;
    const content = `
        <form id="editGymAvailabilityForm" style="display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
                <label>Дата: ${date.replace(/-/g, ' ')}</label>
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
                <label>Добавить временной слот</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="time" id="slotStart" required> —
                    <input type="time" id="slotEnd" required>
                    <button type="button" class="btn btn-sm" onclick="addPersonalSlot()">Добавить</button>
                </div>
            </div>
            <div id="existingSlots" style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px;">Существующие слоты</h4>
                <ul id="slotList" style="margin-bottom: 20px;"></ul>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn" onclick="closeModal()">Закрыть</button>
            </div>
        </form>
    `;
    openModal('Редактирование доступности', content, null);
    loadSlotList();
};

window.addPersonalSlot = async function(e) {
    if (e) e.preventDefault();
    const user = getCurrentUser();
    const start = document.getElementById('slotStart').value;
    const end = document.getElementById('slotEnd').value;
    if (!start || !end) return alert('Заполните время');
    const startDateTime = new Date(_selectedDate + 'T' + start);
    const endDateTime = new Date(_selectedDate + 'T' + end);
    if (endDateTime <= startDateTime) return alert('Время окончания должно быть позже начала');

    const res = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString()
        })
    });
    if (res.ok) {
        alert('Слот добавлен');
        await loadSlotList();
        await refreshGymSchedule();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

async function loadSlotList() {
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions?date=${_selectedDate}`);
    if (!res.ok) return;
    const sessions = await res.json();
    const list = document.getElementById('slotList');
    if (list) {
        list.innerHTML = sessions.map(s => {
            const start = new Date(s.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const end = new Date(s.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const booked = s.booked > 0;
            return `<li style="margin-bottom: 5px;">${start} - ${end} ${booked ? '(занято)' : ''} ${!booked ? `<button type="button" class="btn btn-sm" onclick="deletePersonalSlot(${s.id}, event)">Удалить</button>` : ''}</li>`;
        }).join('');
    }
}

async function refreshManagerClients() {
    _allManagerClients = await fetchAllClients();
    const tableContainer = document.getElementById('managerClientsTable');
    if (tableContainer) {
        tableContainer.innerHTML = buildManagerClientsTable(_allManagerClients);
    }
    const guestTable = document.getElementById('guestClientsTable');
    if (guestTable) {
        const tbody = guestTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = (_allManagerClients || []).map(c => `
                <tr class="guest-client-row" data-name="${c.name.toLowerCase()}" data-phone="${c.phone}">
                    <td>${c.id}</td>
                    <td>${c.name.replace(/'/g, "\\'")}</td>
                    <td>${c.phone}</td>
                    <td>${c.email ? c.email.replace(/'/g, "\\'") : ''}</td>
                    <td><span class="status-badge ${c.activity_status === 'active' ? 'status-active' : 'status-expired'}">${c.activity_status === 'active' ? 'Активен' : 'Неактивен'}</span></td>
                    <td><button class="btn btn-sm" onclick="selectClientForGuestCode(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.phone}', '${c.email ? c.email.replace(/'/g, "\\'") : ''}')">Выбрать</button></td>
                </tr>
            `).join('');
        }
    }
    const activeCount = _allManagerClients.filter(c => c.activity_status === 'active').length;
    const totalCount = _allManagerClients.length;
    const activeSpan = document.getElementById('managerActiveCount');
    const totalSpan = document.getElementById('managerTotalCount');
    if (activeSpan) activeSpan.innerText = activeCount;
    if (totalSpan) totalSpan.innerText = totalCount;
}

async function refreshManagerTrainings() {
    const response = await fetch(`${API_URL}/manager/trainings`);
    if (!response.ok) {
        console.error('Failed to fetch trainings');
        return;
    }
    _allManagerTrainings = await response.json();
    // Если бэкенд уже сортирует, можно не сортировать, но для страховки:
    _allManagerTrainings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    // Применяем фильтры (они сохранят текущие значения)
    filterManagerTrainings();
}

async function refreshAdminUsers() {
    _allUsers = await fetchAllUsers();
    filterAdminUsers();
}

async function refreshAdminSettings() {
    _allSettings = await fetchSystemSettings();
    filterAdminSettings();
}

async function refreshAdminLogs() {
    _allLogs = await fetchSystemLogs();
    const tableContainer = document.getElementById('adminLogsTable');
    if (tableContainer) {
        tableContainer.innerHTML = buildAdminLogsTable(_allLogs);
    }
}

window.deletePersonalSlot = async function(sessionId, e) {
    if (e) e.preventDefault();
    if (!confirm('Удалить этот слот?')) return;
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/personal-sessions/${sessionId}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Слот удалён');
        await loadSlotList();
        await refreshGymSchedule();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

async function renderClientSections() {
    const dateOptions = _uniqueTrainingDates.map(d => {
        const formatted = d.split('-').reverse().join('.');
        return `<option value="${d}">${formatted}</option>`;
    }).join('');

    const specOptions = _allSpecializations.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    const trainersHtml = _myTrainers.map(t => {
        const rating = t.my_rating || 0;
let starsHtml = '<div class="rating-stars">';
for (let i = 5; i >= 1; i--) {
    const filled = i <= (t.my_rating || 0) ? 'filled' : '';
    starsHtml += `<span class="rating-star ${filled}" onclick="rateTrainer(${t.trainer_id}, ${i})">★</span>`;
}
starsHtml += '</div>';
        return `
            <tr>
                <td>${t.trainer_name}</td>
                <td>${t.specialization || '—'}</td>
                <td>${t.past_trainings}</td>
                <td class="rating-stars">${starsHtml}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="profile-section" id="client-schedule">
            <h3>Моё расписание</h3>
            <div class="date-navigation" style="margin-bottom: 15px;">
                <button class="btn btn-sm" onclick="prevClientDay()">←</button>
                <span id="clientCurrentDateDisplay" style="margin: 0 10px;">${_selectedClientDate.replace(/-/g, ' ')}</span>
                <button class="btn btn-sm" onclick="nextClientDay()">→</button>
            </div>
            <div class="table-scroll" id="clientScheduleTable">
                ${buildClientScheduleTable(_clientSchedule.filter(s => s.date.split(' ')[0] === _selectedClientDate))}
            </div>
        </div>
        <div class="profile-section" id="visits">
            <h3>История посещений</h3>
            <div class="section-filters">
                <input type="text" id="visitFilter" placeholder="Поиск по дате" onkeyup="filterVisits()">
                <select id="visitStatusFilter" onchange="filterVisits()">
                    <option value="all">Все статусы</option>
                    <option value="true">Успешные</option>
                    <option value="false">Неуспешные</option>
                </select>
            </div>
            <div class="table-scroll" id="visitsTable">${buildVisitsTable(_allVisits)}</div>
        </div>
        <div class="profile-section" id="trainings">
            <h3>Мои тренировки</h3>
            <div class="section-filters">
                <input type="text" id="trainingFilter" placeholder="Поиск по названию" onkeyup="filterTrainings()">
                <select id="trainingStatusFilter" onchange="filterTrainings()">
                    <option value="all">Все статусы</option>
                    <option value="подтверждено">Подтверждено</option>
                    <option value="отменено">Отменено</option>
                </select>
                <select id="trainingDateFilter" onchange="filterTrainings()">
                    <option value="all">Все даты</option>
                    ${dateOptions}
                </select>
            </div>
            <div class="table-scroll" id="trainingsTable">
                ${buildTrainingsTable(_allTrainings)}
            </div>
        </div>
        <div class="profile-section" id="my-trainers">
            <h3>Мои тренеры</h3>
            <div class="section-filters">
                <input type="text" id="trainerNameFilter" placeholder="Поиск по имени" onkeyup="filterMyTrainers()">
                <select id="trainerSpecFilter" onchange="filterMyTrainers()">
                    <option value="all">Все специализации</option>
                    ${specOptions}
                </select>
            </div>
            <div class="table-scroll" id="myTrainersTable">
                <table>
                    <thead>
                        <tr>
                            <th>Тренер</th>
                            <th>Специализация</th>
                            <th>Количество тренировок</th>
                            <th>Моя оценка</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trainersHtml || '<tr><td colspan="4">Нет данных</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="profile-section" id="orders">
    <h3>Мои заказы</h3>
    <div class="section-filters">
        <input type="text" id="orderFilter" placeholder="Поиск по товару" onkeyup="filterOrders()">
        <select id="orderStatusFilter" onchange="filterOrders()">
            <option value="all">Все статусы</option>
            <option value="оплачен">Оплачен</option>
            <option value="выдан">Выдан</option>
            <option value="активен">Активен</option>
        </select>
        <select id="orderTypeFilter" onchange="filterOrders()">
            <option value="all">Все типы</option>
            <option value="товар">Товары</option>
            <option value="абонемент">Абонементы</option>
        </select>
    </div>
    <div class="table-scroll" id="ordersTable">${buildOrdersTable(_allOrders)}</div>
</div>
    `;
}

window.filterMyTrainers = function() {
    const nameFilter = document.getElementById('trainerNameFilter')?.value.toLowerCase() || '';
    const specFilter = document.getElementById('trainerSpecFilter')?.value || 'all';
    const filtered = _myTrainers.filter(t => {
        const nameMatch = t.trainer_name.toLowerCase().includes(nameFilter);
        const specMatch = specFilter === 'all' || (t.specialization && t.specialization.includes(specFilter));
        return nameMatch && specMatch;
    });
    const tbody = document.querySelector('#myTrainersTable tbody');
    if (tbody) {
        tbody.innerHTML = filtered.map(t => {
            const rating = t.my_rating || 0;
let starsHtml = '<div class="rating-stars">';
for (let i = 5; i >= 1; i--) {
    const filled = i <= (t.my_rating || 0) ? 'filled' : '';
    starsHtml += `<span class="rating-star ${filled}" onclick="rateTrainer(${t.trainer_id}, ${i})">★</span>`;
}
starsHtml += '</div>';
            return `
                <tr>
                    <td>${t.trainer_name}</td>
                    <td>${t.specialization || '—'}</td>
                    <td>${t.past_trainings}</td>
                    <td class="rating-stars">${starsHtml}</td>
                </tr>
            `;
        }).join('');
    }
};

window.hoverStar = function(star, index) {
    const container = star.parentElement;
    const stars = container.querySelectorAll('.rating-star');
    stars.forEach(s => {
        s.classList.remove('filled', 'hover');
    });
    for (let i = 0; i <= index; i++) {
        stars[i].classList.add('hover');
    }
};

window.resetStars = function(star) {
    const container = star.parentElement;
    const stars = container.querySelectorAll('.rating-star');
    const trainerId = container.dataset.trainerId;
    const trainer = _myTrainers.find(t => t.trainer_id == trainerId);
    const currentRating = trainer ? trainer.my_rating : 0;
    stars.forEach((s, i) => {
        s.classList.remove('hover', 'filled');
        if (i < currentRating) {
            s.classList.add('filled');
        }
    });
};

window.rateTrainer = async function(trainerId, rating) {
    const user = getCurrentUser();
    if (!user) return;
    const res = await fetch(`${API_URL}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: user.id, trainer_id: trainerId, rating })
    });
    if (res.ok) {
        const data = await res.json();
        const trainer = _myTrainers.find(t => t.trainer_id === trainerId);
        if (trainer) trainer.my_rating = rating;
        filterMyTrainers();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

window.prevClientDay = function() {
    const date = new Date(_selectedClientDate);
    date.setDate(date.getDate() - 1);
    _selectedClientDate = date.toISOString().split('T')[0];
    document.getElementById('clientCurrentDateDisplay').innerText = _selectedClientDate.replace(/-/g, ' ');
    filterClientScheduleByDate();
};

window.nextClientDay = function() {
    const date = new Date(_selectedClientDate);
    date.setDate(date.getDate() + 1);
    _selectedClientDate = date.toISOString().split('T')[0];
    document.getElementById('clientCurrentDateDisplay').innerText = _selectedClientDate.replace(/-/g, ' ');
    filterClientScheduleByDate();
};

function filterClientScheduleByDate() {
    const filtered = _clientSchedule.filter(s => s.date.split(' ')[0] === _selectedClientDate);
    document.getElementById('clientScheduleTable').innerHTML = buildClientScheduleTable(filtered);
}

function buildClientScheduleTable(schedule) {
    if (!schedule.length) return '<p>Нет тренировок на этот день</p>';
    return `
        <table>
            <thead>
                <tr>
                    <th>Название</th>
                    <th>Тренер</th>
                    <th>Время</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
                ${schedule.map(s => {
                    const start = new Date(s.date.replace(' ', 'T'));
                    const end = new Date(s.end_date.replace(' ', 'T'));
                    const startStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    const endStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    const timeRange = `${startStr} - ${endStr}`;
                    return `
                        <tr>
                            <td>${s.name}</td>
                            <td>${s.trainer}</td>
                            <td>${timeRange}</td>
                            <td><span class="status-badge ${s.status === 'подтверждено' ? 'status-active' : 'status-expired'}">${s.status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function renderTrainerSections() {
    const user = getCurrentUser();

    return `
        <div class="profile-section" id="schedule">
            <h3>Моё расписание</h3>
            <div class="date-navigation" style="margin-bottom: 15px;">
                <button class="btn btn-sm" onclick="prevDay()">←</button>
                <span id="currentDateDisplay" style="margin: 0 10px;">${_selectedDate.replace(/-/g, ' ')}</span>
                <button class="btn btn-sm" onclick="nextDay()">→</button>
            </div>
            <div class="table-scroll" id="trainerScheduleTable">
                ${buildTrainerScheduleTable(_allSchedule.filter(s => s.date.split(' ')[0] === _selectedDate))}
            </div>
        </div>

        <div class="profile-section" id="gym-schedule">
    <h3>Расписание в тренажёрном зале</h3>
    <div class="date-navigation" style="margin-bottom: 15px;">
        <button class="btn btn-sm" onclick="prevGymDay()">←</button>
        <span id="gymCurrentDateDisplay" style="margin: 0 10px;">${_selectedDate.replace(/-/g, ' ')}</span>
        <button class="btn btn-sm" onclick="nextGymDay()">→</button>
        <button class="btn btn-sm" onclick="editGymAvailability()" style="margin-left: 20px;">Редактировать доступность</button>
    </div>
    <div class="table-scroll" id="trainerGymScheduleTable">
        ${await buildTrainerGymScheduleTable(_selectedDate)}
    </div>
    <div class="hourly-rate-block" style="margin-top: 20px; padding: 15px; background: var(--bg-light); border-radius: var(--border-radius);">
        <div style="display: flex; align-items: center; gap: 10px;">
            <strong>Цена за час:</strong>
            <span id="currentRate">${user.hourly_rate ? user.hourly_rate + ' ₽' : 'Не указана'}</span>
            <button class="btn btn-sm" onclick="editHourlyRate()">✎</button>
        </div>
    </div>
</div>

       <div class="profile-section" id="group-schedule">
            <h3>Расписание в групповых залах</h3>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <label for="groupTypeFilter">Группа:</label>
                <select id="groupTypeFilter" onchange="filterGroupSessions()" style="min-width: 150px;">
                <option value="all">Все группы</option>
                ${_groupTypes.map(gt => `<option value="${gt.id}">${gt.name}</option>`).join('')}
                </select>
            <div style="display: flex; gap: 10px; margin-left: 20px;">
            <button class="btn btn-sm" onclick="addGroupType()">Добавить группу</button>
            <button class="btn btn-sm" onclick="editGroupTypeList()">Редактировать группу</button>
        </div>
        <button class="btn btn-sm" onclick="addGroupSession()" style="margin-left: auto;">Добавить тренировку</button>
    </div>
    <div class="table-scroll" id="trainerGroupSessionsTable">
        ${buildTrainerGroupSessionsTable(_trainerGroupSessions)}
    </div>
</div>

        <div class="profile-section" id="clients">
            <h3>Мои клиенты</h3>
            <div class="section-filters">
                <input type="text" id="trainerClientsFilter" placeholder="Поиск по имени" onkeyup="filterTrainerClients()">
            </div>
            <div class="table-scroll" id="trainerClientsTable">
                ${buildTrainerClientsTable(_allTrainerClients)}
            </div>
        </div>
    `;
}

window.editHourlyRate = function() {
    const user = getCurrentUser();
    const content = `
        <form id="editRateForm">
            <div class="form-group">
                <label>Цена за час (₽)</label>
                <input type="number" id="hourlyRate" value="${user.hourly_rate || ''}" min="0" step="10">
            </div>
        </form>
    `;
    openModal('Редактирование цены', content, async () => {
        const rate = parseInt(document.getElementById('hourlyRate').value);
        if (isNaN(rate) || rate < 0) return alert('Введите корректную цену');
        const res = await fetch(`${API_URL}/trainer/${user.id}/hourly-rate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hourly_rate: rate })
        });
        if (res.ok) {
            alert('Цена обновлена');
            user.hourly_rate = rate;
            document.getElementById('currentRate').innerText = rate + ' ₽';
            closeModal();
        } else {
            alert('Ошибка');
        }
    });
};

window.editGroupTypeList = function() {
    if (_groupTypes.length === 0) {
        alert('Нет созданных групп');
        return;
    }
    const listHtml = _groupTypes.map(gt => `
        <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
            <span style="flex: 1;">${gt.name}</span>
            <button class="btn btn-sm" onclick="editGroupType(${gt.id})">✎</button>
            <button class="btn btn-sm" onclick="deleteGroupType(${gt.id})">🗑</button>
        </li>
    `).join('');
    const content = `
        <div style="margin-bottom: 20px;">
            <ul style="list-style: none; padding: 0;">${listHtml}</ul>
        </div>
        <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-sm" onclick="closeModal()">Закрыть</button>
        </div>
    `;
    openModal('Редактирование групп', content, null);
};

window.addGroupType = function() {
    const content = `
        <form id="addGroupTypeForm">
            <div class="form-group">
                <label>Название группы</label>
                <input type="text" id="groupName" required>
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="groupDescription" rows="3"></textarea>
            </div>
        </form>
    `;
    openModal('Добавление группы тренировок', content, async () => {
        const name = document.getElementById('groupName').value;
        const description = document.getElementById('groupDescription').value;
        if (!name) return alert('Введите название');
        const user = getCurrentUser();
        const res = await fetch(`${API_URL}/trainer/${user.id}/group-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (res.ok) {
            alert('Группа добавлена');
            await reloadGroupTypes();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.editGroupType = async function(typeId) {
    const group = _groupTypes.find(g => g.id === typeId);
    if (!group) return;
    const content = `
        <form id="editGroupTypeForm">
            <div class="form-group">
                <label>Название группы</label>
                <input type="text" id="groupName" value="${group.name}" required>
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="groupDescription" rows="3">${group.description || ''}</textarea>
            </div>
        </form>
    `;
    openModal('Редактирование группы', content, async () => {
        const name = document.getElementById('groupName').value;
        const description = document.getElementById('groupDescription').value;
        if (!name) return alert('Введите название');
        const user = getCurrentUser();
        const res = await fetch(`${API_URL}/trainer/${user.id}/group-types/${typeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (res.ok) {
            alert('Группа обновлена');
            await reloadGroupTypes();
            closeModal();
            await loadGroupSessions();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.deleteGroupType = async function(typeId) {
    if (!confirm('Удалить группу? Это нельзя отменить, если у неё есть тренировки.')) return;
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/group-types/${typeId}`, {
        method: 'DELETE'
    });
    if (res.ok) {   
        alert('Группа удалена');
        await reloadGroupTypes();
        if (_selectedGroupType === typeId.toString()) {
            _selectedGroupType = 'all';
            document.getElementById('groupTypeFilter').value = 'all';
        }
        await loadGroupSessions();
        closeModal();
        editGroupTypeList();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

async function reloadGroupTypes() {
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainer/${user.id}/group-types`);
    if (res.ok) {
        _groupTypes = await res.json();
        const filter = document.getElementById('groupTypeFilter');
        if (filter) {
            filter.innerHTML = '<option value="all">Все группы</option>' + 
                _groupTypes.map(gt => `<option value="${gt.id}" ${_selectedGroupType === gt.id.toString() ? 'selected' : ''}>${gt.name}</option>`).join('');
        }
    }
}

window.filterGroupSessions = async function() {
    const groupTypeId = document.getElementById('groupTypeFilter').value;
    _selectedGroupType = groupTypeId;
    await loadGroupSessions();
};

async function renderManagerSections() {
    const specializations = await fetchAllSpecializations();

    setTimeout(() => {
    const guestPhoneInput = document.getElementById('guestPhone');
    if (guestPhoneInput && !guestPhoneInput.hasAttribute('data-mask-initialized')) {
        guestPhoneInput.setAttribute('data-mask-initialized', 'true');
        guestPhoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value[0] === '7' || value[0] === '8') value = value.substring(1);
                if (value.length > 10) value = value.substring(0, 10);
                const match = value.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
                if (match) {
                    let formatted = '';
                    if (match[1]) formatted = `+7 (${match[1]}`;
                    if (match[2]) formatted += `) ${match[2]}`;
                    if (match[3]) formatted += `-${match[3]}`;
                    if (match[4]) formatted += `-${match[4]}`;
                    e.target.value = formatted;
                }
            } else {
                e.target.value = '';
            }
        });
    }
}, 100);

    return `
        <div class="profile-section" id="manage-clients">
            <h3>Управление клиентами</h3>
            <div class="section-filters">
                <input type="text" id="managerClientFilter" placeholder="Поиск по имени/телефону" onkeyup="filterManagerClients()">
                <select id="managerClientStatusFilter" onchange="filterManagerClients()">
                    <option value="all">Все статусы</option>
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                </select>
                <button class="btn btn-sm" onclick="addClient()">Добавить клиента</button>
            </div>
            <div class="table-scroll" id="managerClientsTable">
                ${buildManagerClientsTable(_allManagerClients || [])}
            </div>
        </div>

        <div class="profile-section" id="manage-schedule">
    <h3>Управление расписанием</h3>
    <div class="section-filters" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
        <div class="filter-group">
            <label for="scheduleTypeFilterManager">Тип тренировки:</label>
            <select id="scheduleTypeFilterManager" onchange="filterManagerTrainings()">
                <option value="all">Все</option>
                <option value="персональная">Тренажёрный зал (персональные)</option>
                <option value="групповая">Групповой зал</option>
            </select>
        </div>
        <div class="filter-group" id="groupTypeFilterManagerContainer" style="display: none;">
            <label for="groupTypeFilterManager">Тип групповой:</label>
            <select id="groupTypeFilterManager" onchange="filterManagerTrainings()">
                <option value="all">Все</option>
                ${_groupTrainingNames.map(name => `<option value="${name}">${name}</option>`).join('')}
            </select>
        </div>
        <div class="filter-group">
            <label for="trainerFilterManager">Тренер:</label>
            <select id="trainerFilterManager" onchange="filterManagerTrainings()">
                <option value="all">Все</option>
                ${_trainersList.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
        </div>
        <div class="filter-group">
            <label for="dateFilterManager">Дата:</label>
            <input type="date" id="dateFilterManager" onchange="filterManagerTrainings()">
        </div>
        <button class="btn btn-sm" onclick="addTrainingItem()">Добавить тренировку</button>
    </div>
    <div class="table-scroll" id="managerTrainingsTable">
    <!-- Таблица будет заполнена через refreshManagerTrainings -->
</div>
</div>

        <div class="profile-section" id="manage-products">
            <h3>Управление товарами</h3>
            <div class="section-filters">
                <input type="text" id="managerProductFilter" placeholder="Поиск по названию" onkeyup="filterManagerProducts()">
                <button class="btn btn-sm" onclick="addProductItem()">Добавить товар</button>
            </div>
            <div class="table-scroll" id="managerProductsTable">
                ${buildManagerProductsTable(_allProducts || [])}
            </div>
        </div>

        <div class="profile-section" id="manage-services">
    <h3>Управление услугами</h3>
    <div class="section-filters">
        <input type="text" id="managerServiceFilter" placeholder="Поиск по названию" onkeyup="filterManagerServices()">
        <select id="managerServiceStatusFilter" onchange="filterManagerServices()">
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
        </select>
        <button class="btn btn-sm" onclick="addServiceItem()">Добавить услугу</button>
    </div>
    <div class="table-scroll" id="managerServicesTable">
        <!-- таблица будет заполнена через filterManagerServices -->
    </div>
</div>

        <div class="profile-section" id="manage-specializations">
            <h3>Управление специализациями</h3>
            <button class="btn btn-sm" onclick="addSpecialization()">Добавить специализацию</button>
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${specializations.map(s => `
                            <tr>
                                <td>${s.id}</td>
                                <td>${s.name}</td>
                                <td>${s.description || ''}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="editSpecialization(${s.id})">✎</button>
                                    <button class="btn btn-sm" onclick="deleteSpecialization(${s.id})">🗑</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="profile-section" id="guest-code">
    <h3>Генерация гостевого кода</h3>
    <div class="form-group"><label>Поиск клиента</label><input type="text" id="guestClientSearch" placeholder="Введите имя или телефон" onkeyup="filterGuestClients()"></div>
    <div class="table-scroll" style="max-height:300px;">
        <table id="guestClientsTable">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Телефон</th>
                    <th>Email</th>
                    <th>Статус</th>
                    <th>Действие</th>
                </tr>
            </thead>
            <tbody>
                ${(_allManagerClients || []).map(c => `
                    <tr class="guest-client-row" data-name="${c.name.toLowerCase()}" data-phone="${c.phone}">
                        <td>${c.id}</td>
                        <td>${c.name.replace(/'/g, "\\'")}</td>
                        <td>${c.phone}</td>
                        <td>${c.email ? c.email.replace(/'/g, "\\'") : ''}</td>
                        <td><span class="status-badge ${c.activity_status === 'active' ? 'status-active' : 'status-expired'}">${c.activity_status === 'active' ? 'Активен' : 'Неактивен'}</span></td>
                        <td><button class="btn btn-sm" onclick="selectClientForGuestCode(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.phone}', '${c.email ? c.email.replace(/'/g, "\\'") : ''}')">Выбрать</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    <div class="form-group" style="margin-top:20px;"><label>Или введите данные нового клиента</label></div>
    <div id="newGuestClientFields">
        <div class="form-group"><input type="text" id="guestName" placeholder="Имя"></div>
        <div class="form-group"><input type="text" id="guestPhone" placeholder="Телефон"></div>
        <div class="form-group"><input type="email" id="guestEmail" placeholder="Email"></div>
    </div>
    <div class="form-group"><label for="guestDuration">Срок действия (дней)</label><input type="number" id="guestDuration" value="1" min="1" max="30"></div>
    <button class="btn" onclick="generateGuestCode()">Сгенерировать код</button>
    <div id="guestCodeResult" style="margin-top:20px;"></div>
</div>
    `;
}

window.exportReport = function() {
    window.open(`${API_URL}/admin/export-report`, '_blank');
};

// ================== ИСПРАВЛЕННАЯ ФУНКЦИЯ filterManagerServices ==================
window.filterManagerServices = function() {
    const search = document.getElementById('managerServiceFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('managerServiceStatusFilter')?.value || 'all';
    let filtered = [..._allServices];
    if (search) filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    if (status === 'active') filtered = filtered.filter(s => s.is_active === true);
    else if (status === 'inactive') filtered = filtered.filter(s => s.is_active === false);
    const container = document.getElementById('managerServicesTable');
    if (container) {
        buildManagerServicesTable(filtered).then(html => container.innerHTML = html);
    } else {
        console.warn('Контейнер managerServicesTable не найден в DOM');
    }
};

// ================== ИСПРАВЛЕННАЯ ФУНКЦИЯ refreshManagerServices ==================
async function refreshManagerServices() {
    _allServices = await fetchAllSubscriptions();
    // Даём DOM время обновиться после закрытия модального окна
    setTimeout(() => {
        if (typeof window.filterManagerServices === 'function') {
            window.filterManagerServices();
        }
    }, 50);
}

async function refreshAdminServices() {
    _allServices = await fetchAllSubscriptions();
    setTimeout(() => {
        if (typeof window.filterAdminServices === 'function') {
            window.filterAdminServices();
        }
    }, 50);
}

// ================== ФУНКЦИЯ ДЛЯ АДМИНИСТРАТОРА (оставляем как есть, но добавим проверку) ==================
window.filterAdminServices = function() {
    const search = document.getElementById('adminServiceFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('adminServiceStatusFilter')?.value || 'all';
    let filtered = [..._allServices];
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }
    if (status === 'active') {
        filtered = filtered.filter(s => s.is_active === true);
    } else if (status === 'inactive') {
        filtered = filtered.filter(s => s.is_active === false);
    }
    const container = document.getElementById('adminServicesTable');
    if (container) {
        buildManagerServicesTable(filtered).then(html => container.innerHTML = html);
    } else {
        console.warn('Контейнер adminServicesTable не найден в DOM');
    }
};

window.addServiceItem = async function() {
    const accessTypes = await fetchAllSubscriptionAccessTypes();
    const datalistId = 'accessTypeList';
    const datalistHtml = `<datalist id="${datalistId}">${accessTypes.map(t => `<option value="${t}">`).join('')}</datalist>`;
    const content = `
        <form id="addServiceForm">
            <div class="form-group"><label>Название</label><input type="text" id="servName" required></div>
            <div class="form-group"><label>Описание</label><textarea id="servDesc"></textarea></div>
            <div class="form-group"><label>Цена</label><input type="number" id="servPrice" step="0.01" required></div>
            <div class="form-group"><label>Срок (дней)</label><input type="number" id="servDuration" required></div>
            <div class="form-group"><label>Тип доступа</label>
                <input type="text" id="servAccess" list="${datalistId}" placeholder="Выберите или введите новый">
                ${datalistHtml}
            </div>
            <div class="form-group"><label>Активен</label>
                <input type="checkbox" id="servActive" checked>
            </div>
        </form>
    `;
    openModal('Добавление услуги', content, async () => {
        const name = document.getElementById('servName').value;
        const description = document.getElementById('servDesc').value;
        const price = parseFloat(document.getElementById('servPrice').value);
        const duration = parseInt(document.getElementById('servDuration').value);
        const access = document.getElementById('servAccess').value;
        const is_active = document.getElementById('servActive').checked;

        if (!name || !price || !duration) return alert('Заполните все поля');

        const res = await fetch(`${API_URL}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, duration, price, access, is_active, user_id: getCurrentUser()?.id })
        });

        if (res.ok) {
            alert('Услуга добавлена');
            const user = getCurrentUser();
            if (user.role === 'Менеджер') {
                await refreshManagerServices();
            } else if (user.role === 'Администратор') {
                await refreshAdminServices();
            }
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

async function buildManagerServicesTable(services) {
    if (!services || services.length === 0) return '<div class="text-center">Нет услуг</div>';
    return `<table><thead><tr><th>ID</th><th>Название</th><th>Цена</th><th>Срок</th><th>Доступ</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>${services.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>${s.price} ₽</td>
                <td>${s.duration} дн.</td>
                <td>${s.access || '—'}</td>
                <td><span class="status-badge ${s.is_active ? 'status-active' : 'status-expired'}">${s.is_active ? 'Активен' : 'Неактивен'}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="editService(${s.id})">✎</button>
                    <button class="btn btn-sm" onclick="deleteService(${s.id})">🗑</button>
                </td>
            </tr>`).join('')}</tbody></table>`;
}


document.addEventListener('change', function(e) {
    if (e.target.id === 'scheduleTypeFilterManager') {
        const container = document.getElementById('groupTypeFilterManagerContainer');
        if (container) container.style.display = e.target.value === 'групповая' ? 'inline-flex' : 'none';
    }
});

async function renderAdminSections() {
    const specializations = await fetchAllSpecializations();

    return `
        <div class="profile-section" id="manage-users">
    <h3>Управление пользователями</h3>
    <div class="section-filters">
        <input type="text" id="adminUserFilter" placeholder="Поиск по имени/email" onkeyup="filterAdminUsers()">
        <select id="adminUserRoleFilter" onchange="filterAdminUsers()">
            <option value="all">Все роли</option>
            <option value="Клиент">Клиент</option>
            <option value="Тренер">Тренер</option>
            <option value="Менеджер">Менеджер</option>
            <option value="Администратор">Администратор</option>
        </select>
        <select id="adminUserStatusFilter" onchange="filterAdminUsers()">
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="blocked">Заблокированные</option>
        </select>
        <button class="btn btn-sm" onclick="addUserItem()">Добавить пользователя</button>
    </div>
    <div class="table-scroll" id="adminUsersTable">
        ${buildAdminUsersTable(_allUsers)}
    </div>
</div>

        <div class="profile-section" id="manage-products">
            <h3>Управление товарами</h3>
            <div class="section-filters">
                <input type="text" id="adminProductFilter" placeholder="Поиск по названию" onkeyup="filterAdminProducts()">
                <button class="btn btn-sm" onclick="addProductItem()">Добавить товар</button>
            </div>
            <div class="table-scroll" id="adminProductsTable">
                ${buildManagerProductsTable(_allProducts)}
            </div>
        </div>

        <div class="profile-section" id="manage-services">
            <h3>Управление услугами</h3>
            <div class="section-filters">
                <input type="text" id="adminServiceFilter" placeholder="Поиск по названию" onkeyup="filterAdminServices()">
                <select id="adminServiceStatusFilter" onchange="filterAdminServices()">
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Неактивные</option>
                </select>
                <button class="btn btn-sm" onclick="addServiceItem()">Добавить услугу</button>
            </div>
            <div class="table-scroll" id="adminServicesTable">
                <!-- таблица будет заполнена через filterAdminServices -->
            </div>
        </div>

        <div class="profile-section" id="manage-specializations">
            <h3>Управление специализациями</h3>
            <button class="btn btn-sm" onclick="addSpecialization()">Добавить специализацию</button>
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${specializations.map(s => `
                            <tr>
                                <td>${s.id}</td>
                                <td>${s.name}</td>
                                <td>${s.description || ''}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="editSpecialization(${s.id})">✎</button>
                                    <button class="btn btn-sm" onclick="deleteSpecialization(${s.id})">🗑</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="profile-section" id="settings">
    <h3>Настройки системы</h3>
    <div class="section-filters">
        <input type="text" id="adminSettingsFilter" placeholder="Поиск по ключу" onkeyup="filterAdminSettings()">
    </div>
    <div class="table-scroll" id="adminSettingsTable">
        ${buildAdminSettingsTable(_allSettings)}
    </div>
</div>

        <div class="profile-section" id="logs">
    <h3>Просмотр логов</h3>
    <div class="section-filters" style="flex-wrap: wrap;">
        <input type="text" id="adminLogsSearch" placeholder="Поиск по email/действию" oninput="filterAdminLogs()">
        <select id="adminLogsRoleFilter" onchange="filterAdminLogs()">
            <option value="all">Все роли</option>
            <option value="Клиент">Клиент</option>
            <option value="Тренер">Тренер</option>
            <option value="Менеджер">Менеджер</option>
            <option value="Администратор">Администратор</option>
        </select>
        <select id="adminLogsActionFilter" onchange="filterAdminLogs()">
    <option value="all">Все действия</option>
    <option value="Создание">Создание</option>
    <option value="Обновление">Обновление</option>
    <option value="Удаление">Удаление</option>
    <option value="Вход в систему">Вход в систему</option>
    <option value="Запись на тренировку">Запись на тренировку</option>
    <option value="Отмена записи">Отмена записи</option>
    <option value="Оформление заказа">Оформление заказа</option>
    <option value="Покупка абонемента">Покупка абонемента</option>
    <option value="Оценка тренера">Оценка тренера</option>
    <option value="Генерация гостевого кода">Генерация гостевого кода</option>
    <option value="Изменение цены за час">Изменение цены за час</option>
    <option value="Обновление профиля">Обновление профиля</option>
    <option value="Изменение заметки о клиенте">Изменение заметки о клиенте</option>
    <option value="Создание группы тренировок">Создание группы тренировок</option>
    <option value="Обновление группы тренировок">Обновление группы тренировок</option>
    <option value="Удаление группы тренировок">Удаление группы тренировок</option>
</select>
        <div style="display: flex; gap: 10px;">
            <input type="date" id="adminLogsDateFrom" placeholder="С даты" onchange="filterAdminLogs()">
            <input type="date" id="adminLogsDateTo" placeholder="По дату" onchange="filterAdminLogs()">
        </div>
        <button class="btn btn-sm" onclick="filterAdminLogs()">Применить</button>
    </div>
    <div class="table-scroll" id="adminLogsTable">
        ${buildAdminLogsTable(_allLogs)}
    </div>
</div>

        <div class="profile-section" id="backup">
    <h3>Резервное копирование</h3>
    <button class="btn" onclick="createBackupHandler()">Создать резервную копию</button>
    <div class="table-scroll" style="margin-top:20px;">
        <table class="admin-table" id="backupsTable">
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>Размер</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="backupsTableBody">
                <tr><td colspan="3" class="text-center">Загрузка...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<div class="profile-section" id="report">
    <h3>Отчетность</h3>
    <button class="btn" onclick="exportReport()">Выгрузить отчет (Excel)</button>
    <p class="text-muted" style="margin-top: 10px;">Отчет включает общую статистику, данные по клиентам, тренерам, менеджерам и продажам.</p>
</div>
    `;
}

// Загрузка списка бэкапов и отображение
async function loadBackupsList() {
    const tbody = document.getElementById('backupsTableBody');
    if (!tbody) return;
    try {
        const backups = await fetchBackupsList();
        if (backups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">Нет резервных копий</td></tr>';
            return;
        }
        tbody.innerHTML = backups.map(b => `
            <tr>
                <td>${new Date(b.created_at).toLocaleString('ru-RU')}</td>
                <td>${(b.size / 1024).toFixed(2)} КБ</td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-sm" onclick="downloadBackup('${b.filename}')">📥 Скачать</button>
                    <button class="btn btn-sm btn-danger" onclick="restoreBackupHandler('${b.filename}')">🔄 Восстановить</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Ошибка загрузки списка</td></tr>';
    }
}

let isRestoring = false;

window.restoreBackupHandler = async function(filename) {
    if (isRestoring) {
        console.log('Восстановление уже выполняется, подождите...');
        return;
    }
    if (!confirm(`ВНИМАНИЕ! Восстановление из бэкапа "${filename}" полностью заменит текущую базу данных. Все несохранённые изменения будут утеряны. Продолжить?`)) return;
    
    isRestoring = true;
    try {
        await restoreBackup(filename);  // функция из auth.js
        alert('База данных восстановлена. Страница будет перезагружена.');
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        alert('Ошибка восстановления: ' + err.message);
    } finally {
        isRestoring = false;
    }
};


let isCreatingBackup = false;

window.createBackupHandler = async function() {
    if (isCreatingBackup) {
        console.log('Бэкап уже создаётся, подождите...');
        return;
    }
    if (!confirm('Создать резервную копию базы данных?')) return;
    
    isCreatingBackup = true;
    try {
        await createBackup();  // функция из auth.js
        alert('Резервная копия создана');
        await loadBackupsList();
    } catch (err) {
        alert(err.message);
    } finally {
        isCreatingBackup = false;
    }
};

// Скачивание бэкапа
window.downloadBackup = function(filename) {
    window.open(`${API_URL}/admin/download-backup/${encodeURIComponent(filename)}`, '_blank');
};

window.addSpecialization = function() {
    const content = `
        <form id="addSpecForm">
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="specName" required>
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="specDesc" rows="3"></textarea>
            </div>
        </form>
    `;
    openModal('Добавление специализации', content, async () => {
        const name = document.getElementById('specName').value;
        const description = document.getElementById('specDesc').value;
        if (!name) return alert('Введите название');
        const res = await fetch(`${API_URL}/specializations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (res.ok) {
            alert('Специализация добавлена');
            location.reload();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.editSpecialization = async function(id) {
    const allSpecs = await fetchAllSpecializations();
    const spec = allSpecs.find(s => s.id === id);
    if (!spec) return;
    const content = `
        <form id="editSpecForm">
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="specName" value="${spec.name}" required>
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="specDesc" rows="3">${spec.description || ''}</textarea>
            </div>
        </form>
    `;
    openModal('Редактирование специализации', content, async () => {
        const name = document.getElementById('specName').value;
        const description = document.getElementById('specDesc').value;
        const res = await fetch(`${API_URL}/specializations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (res.ok) {
            alert('Специализация обновлена');
            location.reload();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.deleteSpecialization = async function(id) {
    if (!confirm('Удалить специализацию? Это нельзя отменить.')) return;
    const res = await fetch(`${API_URL}/specializations/${id}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Специализация удалена');
        location.reload();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

function buildVisitsTable(visits) {
    return `<table><thead><tr><th>Дата и время</th><th>Способ</th><th>Статус</th></tr></thead>
        <tbody>${visits.map(v => `<tr><td>${v.date}</td><td>${v.method}</td><td><span class="status-badge ${v.success ? 'status-active' : 'status-expired'}">${v.success ? 'Успешно' : 'Ошибка'}</span></td></tr>`).join('')}</tbody></table>`;
}

function buildTrainingsTable(trainings) {
    const now = new Date();
    return `<table><thead><tr><th>Название</th><th>Тренер</th><th>Дата и время</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>${trainings.map(t => {
            const start = new Date(t.date.replace(' ', 'T'));
            const end = new Date(t.end_date.replace(' ', 'T'));
            const year = start.getFullYear();
            const month = String(start.getMonth() + 1).padStart(2, '0');
            const day = String(start.getDate()).padStart(2, '0');
            const startStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const endStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const dateTimeStr = `${year} ${month} ${day} ${startStr} - ${endStr}`;
            const isPast = end < now;
            return `<tr><td>${t.name}</td><td>${t.trainer}</td><td>${dateTimeStr}</td><td><span class="status-badge ${t.status === 'подтверждено' ? 'status-active' : 'status-expired'}">${t.status}</span></td>
            <td>${(t.status === 'подтверждено' && !isPast) ? `<button class="btn btn-sm" onclick="cancelTraining(${t.id})">Отменить</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table>`;
}

function buildOrdersTable(orders) {
    return `<table><thead><tr><th>Тип</th><th>Наименование</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead>
        <tbody>${orders.map(o => `
            <tr>
                <td>${o.type === 'товар' ? 'Товар' : 'Абонемент'}</td>
                <td>${o.name}</td>
                <td>${o.total} ₽</td>
                <td><span class="status-badge ${o.status === 'выдан' || o.status === 'активен' ? 'status-active' : 'status-pending'}">${o.status}</span></td>
                <td>${new Date(o.date).toLocaleDateString('ru-RU')}</td>
            </tr>`).join('')}</tbody></table>`;
}

function buildTrainerScheduleTable(schedule) {
    if (!schedule.length) return '<p>Нет тренировок на этот день</p>';
    return `
        <table>
            <thead>
                <tr>
                    <th>Название</th>
                    <th>Тип</th>
                    <th>Время</th>
                    <th>Клиенты</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${schedule.map(s => {
                    const date = new Date(s.date.replace(' ', 'T'));
                    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    const clientDisplay = s.type === 'групповая' ? `Групповая (${s.booked} чел.)` : (s.client || '—');
                    return `
                        <tr>
                            <td>${s.name}</td>
                            <td>${s.type === 'групповая' ? 'Групповая' : 'Персональная'}</td>
                            <td>${timeStr}</td>
                            <td>${clientDisplay}</td>
                            <td><span class="status-badge ${s.status === 'подтверждено' ? 'status-active' : 'status-pending'}">${s.status || 'запланировано'}</span></td>
                            <td>
                                <button class="btn btn-sm" onclick="editTrainerSession(${s.id})">✎</button>
                                ${s.booked > 0 ? `<button class="btn btn-sm" onclick="cancelTrainerSession(${s.id})">Отменить</button>` : ''}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function buildTrainerClientsTable(clients) {
    return `<table>
        <thead>
            <tr>
                <th>Имя</th>
                <th>Телефон</th>
                <th>Кол-во тренировок</th>
                <th>Заметка</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            ${clients.map(c => {
                const note = _trainerClientNotes[c.id] || '';
                const formattedPhone = formatPhoneNumber(c.phone);
                return `
                <tr>
                    <td>${c.name}</td>
                    <td>${formattedPhone}</td>
                    <td>${c.trainings}</td>
                    <td style="max-width: 200px; overflow-x: auto; white-space: nowrap;">
                        <div style="overflow-x: auto;">${note}</div>
                    </td>
                    <td>
                        <button class="btn btn-sm" onclick="editClientNote(${c.id}, '${c.name}')">✎ заметку</button>
                        <button class="btn btn-sm" onclick="viewClientContact(${c.id})">👤 контакты</button>
                    </td>
                </tr>
            `}).join('')}
        </tbody>
    </table>`;
}

function buildManagerClientsTable(clients) {
    return `<table><thead><tr><th>ID</th><th>Имя</th><th>Телефон</th><th>Email</th><th>Абонемент</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>${clients.map(c => {
            const statusText = c.activity_status === 'active' ? 'Активен' : 'Неактивен';
            const statusClass = c.activity_status === 'active' ? 'status-active' : 'status-expired';
            const formattedPhone = formatPhoneNumber(c.phone);
            return `<tr>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td>${formattedPhone}</td>
                <td>${c.email}</td>
                <td>${c.subscription}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="editClient(${c.id})">✎</button>
                </td>
            </tr>`;
        }).join('')}</tbody></table>`;
}

window.toggleClientStatus = async function(clientId) {
    if (!confirm('Изменить статус клиента?')) return;
    const res = await fetch(`${API_URL}/admin/users/${clientId}/toggle-block`, { method: 'PATCH' });
    if (res.ok) {
        await refreshManagerClients();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

function buildManagerTrainingsTable(trainings) {
    if (!trainings || trainings.length === 0) return '<div class="text-center">Нет тренировок</div>';
    const now = new Date();
    return `<table>
        <thead>
            <tr>
                <th>Название</th>
                <th>Тренер</th>
                <th>Дата</th>
                <th>Время</th>
                <th>Зал</th>
                <th>Мест</th>
                <th>Записано</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            ${trainings.map(t => {
                const start = new Date(t.start_time);
                const end = new Date(t.end_time);
                const dateStr = start.toLocaleDateString('ru-RU');
                const startStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const endStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const timeStr = `${startStr} - ${endStr}`;
                const isPast = end < now;
                return `<tr>
                    <td>${t.name}</td>
                    <td>${t.trainer}</td>
                    <td>${dateStr}</td>
                    <td>${timeStr}</td>
                    <td>${t.room}</td>
                    <td>${t.max}</td>
                    <td>${t.booked}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-sm" onclick="editTraining(${t.id})">✎</button>
                        ${!isPast ? `<button class="btn btn-sm" onclick="deleteTraining(${t.id})">🗑</button>` : ''}
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

window.deleteTraining = async function(trainingId) {
    if (!confirm('Удалить тренировку?')) return;
    const res = await fetch(`${API_URL}/trainings/${trainingId}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Тренировка удалена');
        await refreshManagerTrainings();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

function buildManagerProductsTable(products) {
    if (!Array.isArray(products) || products.length === 0) {
        return '<div class="text-center">Нет товаров</div>';
    }
    return `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Цена</th>
                    <th>Остаток</th>
                    <th>Категория</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.name}</td>
                        <td>${p.price} ₽</td>
                        <td>${p.stock}</td>
                        <td>${p.category || '—'}</td>
                        <td>
                            <button class="btn btn-sm" onclick="editProduct(${p.id})">✎</button>
                            <button class="btn btn-sm" onclick="deleteProduct(${p.id})">🗑</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


function buildAdminUsersTable(users) {
    if (!users || users.length === 0) return '<div class="text-center">Нет пользователей</div>';
    return `<table class="admin-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(u => {
                let statusText = '';
                let statusClass = '';
                if (u.is_blocked) {
                    statusText = 'Заблокирован';
                    statusClass = 'status-expired';
                } else if (u.is_active) {
                    statusText = 'Активен';
                    statusClass = 'status-active';
                } else {
                    statusText = 'Неактивен';
                    statusClass = 'status-pending';
                }
                return `<tr>
                    <td>${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.phone}</td>
                    <td>${u.role}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-sm" onclick="editUser(${u.id})">✎</button>
                        <button class="btn btn-sm" onclick="toggleBlockUser(${u.id})">${u.is_blocked ? '🔓' : '🔒'}</button>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

function buildAdminSettingsTable(settings) {
    if (!settings || settings.length === 0) return '<div class="text-center">Нет настроек</div>';
    return `<table class="admin-table">
        <thead>
            <tr>
                <th>Ключ</th>
                <th>Значение</th>
                <th>Описание</th>
                <th>Обновлено</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            ${settings.map(s => `
                <tr>
                    <td>${s.key}</td>
                    <td style="max-width: 300px; word-break: break-all;">${typeof s.value === 'object' ? JSON.stringify(s.value) : s.value}</td>
                    <td>${s.description || ''}</td>
                    <td>${s.updated_at ? new Date(s.updated_at).toLocaleString('ru-RU') : ''}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-sm" onclick="editSetting('${s.key}')">✎</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
}

function buildAdminLogsTable(logs) {
    if (!logs || logs.length === 0) return '<div class="text-center">Нет записей</div>';
    return `<table class="admin-table">
        <thead>
            <tr>
                <th>Время</th>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Действие</th>
                <th>Тип</th>
                <th>ID сущности</th>
                <th>IP</th>
                <th>User Agent</th>
            </tr>
        </thead>
        <tbody>
            ${logs.map(l => `
                <tr>
                    <td>${l.time}</td>
                    <td>${l.user_email}</td>
                    <td>${l.user_role}</td>
                    <td>${l.action}</td>
                    <td>${l.entity_type || '—'}</td>
                    <td>${l.entity_id || '—'}</td>
                    <td>${l.ip_address || '—'}</td>
                    <td style="max-width: 200px; word-break: break-all;">${l.user_agent ? l.user_agent.substring(0, 60) : '—'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
}

window.filterVisits = function() {
    const filter = document.getElementById('visitFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('visitStatusFilter')?.value || 'all';
    let filtered = _allVisits;
    if (filter) filtered = filtered.filter(v => v.date.toLowerCase().includes(filter));
    if (status !== 'all') filtered = filtered.filter(v => String(v.success) === status);
    document.getElementById('visitsTable').innerHTML = buildVisitsTable(filtered);
};

window.filterTrainings = function() {
    const filter = document.getElementById('trainingFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('trainingStatusFilter')?.value || 'all';
    const date = document.getElementById('trainingDateFilter')?.value || 'all';

    let filtered = _allTrainings;

    if (date !== 'all') {
        filtered = filtered.filter(t => t.date.split(' ')[0] === date);
    }

    if (filter) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(filter) || 
            t.trainer.toLowerCase().includes(filter)
        );
    }

    if (status !== 'all') {
        filtered = filtered.filter(t => t.status === status);
    }

    document.getElementById('trainingsTable').innerHTML = buildTrainingsTable(filtered);
};

window.filterOrders = function() {
    const filter = document.getElementById('orderFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('orderStatusFilter')?.value || 'all';
    const type = document.getElementById('orderTypeFilter')?.value || 'all';
    let filtered = _allOrders;
    if (filter) filtered = filtered.filter(o => o.name.toLowerCase().includes(filter));
    if (status !== 'all') filtered = filtered.filter(o => o.status === status);
    if (type !== 'all') filtered = filtered.filter(o => o.type === type);
    document.getElementById('ordersTable').innerHTML = buildOrdersTable(filtered);
};

window.filterTrainerSchedule = function() {
    const filter = document.getElementById('trainerScheduleFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('trainerScheduleStatusFilter')?.value || 'all';
    let filtered = _allSchedule;
    if (filter) filtered = filtered.filter(s => s.client.toLowerCase().includes(filter));
    if (status !== 'all') filtered = filtered.filter(s => s.status === status);
    document.getElementById('trainerScheduleTable').innerHTML = buildTrainerScheduleTable(filtered);
};

window.filterTrainerClients = function() {
    const filter = document.getElementById('trainerClientsFilter')?.value.toLowerCase() || '';
    let filtered = _allTrainerClients;
    if (filter) filtered = filtered.filter(c => c.name.toLowerCase().includes(filter));
    document.getElementById('trainerClientsTable').innerHTML = buildTrainerClientsTable(filtered);
};

window.filterManagerClients = function() {
    const filter = document.getElementById('managerClientFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('managerClientStatusFilter')?.value || 'all';
    let filtered = _allManagerClients;
    if (filter) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(filter) || c.phone.includes(filter));
    }
    if (status !== 'all') {
        if (status === 'active') {
            filtered = filtered.filter(c => c.activity_status === 'active');
        } else if (status === 'inactive') {
            filtered = filtered.filter(c => c.activity_status === 'inactive');
        }
    }
    document.getElementById('managerClientsTable').innerHTML = buildManagerClientsTable(filtered);
};

window.filterManagerTrainings = function() {
    const typeFilter = document.getElementById('scheduleTypeFilterManager')?.value || 'all';
    const groupTypeFilter = document.getElementById('groupTypeFilterManager')?.value || 'all';
    const trainerFilter = document.getElementById('trainerFilterManager')?.value || 'all';
    const dateFilter = document.getElementById('dateFilterManager')?.value || '';

    let filtered = [..._allManagerTrainings]; // копия

    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    if (groupTypeFilter !== 'all') {
        filtered = filtered.filter(t => t.name === groupTypeFilter);
    }
    if (trainerFilter !== 'all') {
        const trainerId = parseInt(trainerFilter, 10);
        filtered = filtered.filter(t => t.trainer_id === trainerId);
    }
    if (dateFilter) {
        filtered = filtered.filter(t => {
            const datePart = new Date(t.start_time).toISOString().split('T')[0];
            return datePart === dateFilter;
        });
    }

    const tableContainer = document.getElementById('managerTrainingsTable');
    if (tableContainer) {
        tableContainer.innerHTML = buildManagerTrainingsTable(filtered);
    }
};

window.filterManagerProducts = function() {
    const filter = document.getElementById('managerProductFilter')?.value.toLowerCase() || '';
    let filtered = _allProducts;
    if (filter) filtered = filtered.filter(p => p.name.toLowerCase().includes(filter));
    document.getElementById('managerProductsTable').innerHTML = buildManagerProductsTable(filtered);
};

window.filterAdminUsers = function() {
    const search = document.getElementById('adminUserFilter')?.value.toLowerCase() || '';
    const role = document.getElementById('adminUserRoleFilter')?.value || 'all';
    const status = document.getElementById('adminUserStatusFilter')?.value || 'all';
    
    let filtered = [..._allUsers];
    
    if (search) {
        filtered = filtered.filter(u => 
            u.name.toLowerCase().includes(search) || 
            u.email.toLowerCase().includes(search)
        );
    }
    if (role !== 'all') {
        filtered = filtered.filter(u => u.role === role);
    }
    if (status === 'active') {
        filtered = filtered.filter(u => !u.is_blocked && u.is_active === true);
    } else if (status === 'inactive') {
        filtered = filtered.filter(u => !u.is_blocked && u.is_active === false);
    } else if (status === 'blocked') {
        filtered = filtered.filter(u => u.is_blocked === true);
    }
    
    const container = document.getElementById('adminUsersTable');
    if (container) {
        container.innerHTML = buildAdminUsersTable(filtered);
    }
};

window.filterAdminProducts = function() {
    const filter = document.getElementById('adminProductFilter')?.value.toLowerCase() || '';
    let filtered = _allProducts;
    if (filter) filtered = filtered.filter(p => p.name.toLowerCase().includes(filter));
    const container = document.getElementById('adminProductsTable');
    if (container) {
        container.innerHTML = buildManagerProductsTable(filtered);
    }
};

// Фильтрация услуг для администратора (уже есть выше, но оставляем)
// window.filterAdminServices определена выше

window.filterAdminSettings = function() {
    const filter = document.getElementById('adminSettingsFilter')?.value.toLowerCase() || '';
    let filtered = [..._allSettings];
    if (filter) {
        filtered = filtered.filter(s => s.key.toLowerCase().includes(filter));
    }
    const container = document.getElementById('adminSettingsTable');
    if (container) {
        container.innerHTML = buildAdminSettingsTable(filtered);
    }
};


window.filterAdminLogs = async function() {
    const role = document.getElementById('adminLogsRoleFilter')?.value || 'all';
    const action = document.getElementById('adminLogsActionFilter')?.value || 'all';
    const search = document.getElementById('adminLogsSearch')?.value || '';
    const dateFrom = document.getElementById('adminLogsDateFrom')?.value || '';
    const dateTo = document.getElementById('adminLogsDateTo')?.value || '';

    const filters = { role, action, search, date_from: dateFrom, date_to: dateTo };
    _allLogs = await fetchSystemLogs(filters);
    const container = document.getElementById('adminLogsTable');
    if (container) {
        container.innerHTML = buildAdminLogsTable(_allLogs);
    }
};

window.filterGuestClients = function() {
    const search = document.getElementById('guestClientSearch').value.toLowerCase();
    const rows = document.querySelectorAll('.guest-client-row');
    rows.forEach(row => {
        const name = row.dataset.name;
        const phone = row.dataset.phone;
        row.style.display = (name.includes(search) || phone.includes(search)) ? '' : 'none';
    });
};

// ========== Face ID загрузка фото (только файл) ==========
window.uploadPhoto = function() {
    openFaceIdUploadModal();
};

function openFaceIdUploadModal() {
    const user = getCurrentUser();
    const savedFaceIdUrl = user ? localStorage.getItem(`faceid_${user.id}`) : null;
    
    const content = `
        <div id="faceIdUploadContainer">
            <div class="form-group">
                <label>Загрузите фото для Face ID</label>
                <div id="faceIdUploader"></div>
                <small>Выберите файл (максимум 5 МБ). Фото будет загружено на сервер в папку FaceID.</small>
            </div>
        </div>
    `;
    openModal('Загрузка фото Face ID', content, async () => {
        closeModal();
    });
    
    setTimeout(() => {
        initFaceIdUploader(savedFaceIdUrl);
    }, 200);
}

function initFaceIdUploader(savedUrl) {
    const container = document.getElementById('faceIdUploader');
    if (!container) return;
    // Разрешаем переинициализацию при каждом открытии, чтобы обновить URL
    // container.dataset.initialized = 'true'; // удаляем эту строку, чтобы окно обновлялось
    const user = getCurrentUser();
    
    container.innerHTML = `
        <div class="image-upload-wrapper">
            <div class="file-input-area">
                <label class="btn btn-sm file-upload-label">Выбрать файл
                    <input type="file" id="faceIdFile" accept="image/*" style="display:none">
                </label>
                <div id="faceIdPreview" class="image-preview" style="display:${savedUrl ? 'block' : 'none'}">
                    <img id="faceIdPreviewImg" class="preview-img" src="${savedUrl || ''}">
                    <span class="remove-preview" title="Удалить">✖</span>
                </div>
            </div>
        </div>
    `;
    
    const fileInput = document.getElementById('faceIdFile');
    const previewDiv = document.getElementById('faceIdPreview');
    const previewImg = document.getElementById('faceIdPreviewImg');
    const removeBtn = container.querySelector('.remove-preview');
    
    fileInput.addEventListener('change', async (e) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            previewImg.src = ev.target.result;
            previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        try {
            const uploadedUrl = await uploadFaceIdImage(file);
            if (user) localStorage.setItem(`faceid_${user.id}`, uploadedUrl);
            alert('Фото успешно загружено на сервер. Можете закрыть окно.');
        } catch (err) {
            alert('Ошибка загрузки: ' + err.message);
            previewDiv.style.display = 'none';
            fileInput.value = '';
        }
    });
    
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            previewDiv.style.display = 'none';
            fileInput.value = '';
            if (user) localStorage.removeItem(`faceid_${user.id}`);
        });
    }
}

window.cancelTraining = async function(bookingId) {
    const training = _allTrainings.find(t => t.id === bookingId);
    if (!training) {
        alert('Тренировка не найдена');
        return;
    }
    const end = new Date(training.end_date.replace(' ', 'T'));
    if (end < new Date()) {
        alert('Нельзя отменить уже прошедшую тренировку');
        return;
    }
    if (!confirm('Отменить запись?')) return;
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/bookings/${bookingId}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Запись отменена');
        const newTrainings = await fetchClientTrainings(user.id);
        _allTrainings = newTrainings;
        _clientSchedule = _allTrainings
            .filter(t => t.status === 'подтверждено')
            .map(t => ({ ...t }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        _uniqueTrainingDates = [...new Set(_allTrainings.map(t => t.date.split(' ')[0]))].sort();
        const dateSelect = document.getElementById('trainingDateFilter');
        if (dateSelect) {
            const options = _uniqueTrainingDates.map(d => {
                const formatted = d.split('-').reverse().join('.');
                return `<option value="${d}">${formatted}</option>`;
            }).join('');
            dateSelect.innerHTML = '<option value="all">Все даты</option>' + options;
        }
        filterClientScheduleByDate();
        filterTrainings();
        _myTrainers = await fetchMyTrainers(user.id);
        filterMyTrainers();
    } else {
        const err = await res.json();
        alert('Ошибка отмены: ' + (err.error || 'неизвестная ошибка'));
    }
};

window.addTrainingItem = async function() {
    const user = getCurrentUser();
    const isManager = user.role === 'Менеджер';
    if (!isManager) return;

    // Загружаем тренеров
    const trainersRes = await fetch(`${API_URL}/trainers/all`);
    const trainers = await trainersRes.json();
    const trainerOptions = trainers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    // Загружаем группы тренировок (для групповых)
    let groupTypes = [];
    const groupTypesRes = await fetch(`${API_URL}/group-training-types/all`);
    if (groupTypesRes.ok) {
        groupTypes = await groupTypesRes.json();
    }
    const groupOptions = groupTypes.map(gt => `<option value="${gt.id}">${gt.name}</option>`).join('');

    const typeHtml = `
        <div class="form-group">
            <label>Тип тренировки:</label>
            <select id="trainingTypeSelect" required>
                <option value="персональная">Персональная (тренажёрный зал)</option>
                <option value="групповая">Групповая</option>
            </select>
        </div>
    `;

    const personalHtml = `
        <div id="personalFields" class="training-type-fields">
            <div class="form-group"><label>Цена (₽ за час)</label><input type="number" id="personalPrice" value="1500" min="0" step="10"></div>
        </div>
    `;

    const groupHtml = `
        <div id="groupFields" class="training-type-fields" style="display: none;">
            <div class="form-group">
                <label>Группа тренировок</label>
                <select id="groupTypeId">
                    <option value="">-- Выберите группу --</option>
                    ${groupOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Название (можно изменить)</label>
                <input type="text" id="groupName" placeholder="Оставить пустым для использования названия группы">
            </div>
            <div class="form-group"><label>Зал</label><input type="text" id="groupRoom" value="Зал 1"></div>
            <div class="form-group"><label>Макс. участников</label><input type="number" id="groupMax" value="10" min="1"></div>
            <div class="form-group"><label>Цена (₽)</label><input type="number" id="groupPrice" value="500" min="0" step="10"></div>
        </div>
    `;

    const content = `
        <form id="addTrainingForm">
            <div class="form-group"><label>Тренер</label>
                <select id="trainingTrainer">${trainerOptions}</select>
            </div>
            ${typeHtml}
            ${personalHtml}
            ${groupHtml}
            <div class="form-group"><label>Дата и время начала</label><input type="datetime-local" id="trainingStart" required></div>
            <div class="form-group"><label>Длительность (минут)</label><input type="number" id="trainingDuration" value="60" min="15" step="15"></div>
        </form>
    `;

    openModal('Добавление тренировки', content, async () => {
        const trainer_id = parseInt(document.getElementById('trainingTrainer').value, 10);
        const type = document.getElementById('trainingTypeSelect').value;
        const start = document.getElementById('trainingStart').value;
        const duration = parseInt(document.getElementById('trainingDuration').value);
        if (!start) return alert('Заполните дату и время');

        const startDate = new Date(start);
        const endDate = new Date(startDate.getTime() + duration * 60000);

        let name, room, max_participants, price, group_type_id = null;

        if (type === 'персональная') {
            name = 'Персональная тренировка';
            room = 'По договоренности';
            max_participants = 1;
            price = parseInt(document.getElementById('personalPrice').value);
        } else {
            group_type_id = document.getElementById('groupTypeId').value;
            const customName = document.getElementById('groupName').value;
            if (group_type_id) {
                const selectedGroup = groupTypes.find(g => g.id == group_type_id);
                name = customName || (selectedGroup ? selectedGroup.name : 'Групповая тренировка');
            } else {
                name = customName;
                if (!name) return alert('Введите название групповой тренировки или выберите группу');
            }
            room = document.getElementById('groupRoom').value;
            max_participants = parseInt(document.getElementById('groupMax').value);
            price = parseInt(document.getElementById('groupPrice').value);
        }

        const res = await fetch(`${API_URL}/trainings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                trainer_id,
                name,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                max_participants,
                room,
                price,
                group_type_id: group_type_id || null
            })
        });

        if (res.ok) {
            alert('Тренировка добавлена');
            await refreshManagerTrainings();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });

    setTimeout(() => {
        const typeSelect = document.getElementById('trainingTypeSelect');
        const personalDiv = document.getElementById('personalFields');
        const groupDiv = document.getElementById('groupFields');
        if (typeSelect) {
            const toggle = () => {
                if (typeSelect.value === 'персональная') {
                    personalDiv.style.display = 'block';
                    groupDiv.style.display = 'none';
                } else {
                    personalDiv.style.display = 'none';
                    groupDiv.style.display = 'block';
                }
            };
            typeSelect.addEventListener('change', toggle);
            toggle();
        }

        // Автозаполнение названия при выборе группы
        const groupTypeSelect = document.getElementById('groupTypeId');
        const groupNameInput = document.getElementById('groupName');
        if (groupTypeSelect && groupNameInput) {
            groupTypeSelect.addEventListener('change', () => {
                const selectedId = groupTypeSelect.value;
                if (selectedId) {
                    const selectedGroup = groupTypes.find(g => g.id == selectedId);
                    if (selectedGroup && !groupNameInput.value) {
                        groupNameInput.placeholder = selectedGroup.name;
                    }
                } else {
                    groupNameInput.placeholder = 'Оставить пустым для использования названия группы';
                }
            });
        }
    }, 100);
};

window.addProductItem = async function() {
    const categories = await fetchProductCategories();
    const datalistId = 'categoryList';
    const datalistHtml = `<datalist id="${datalistId}">${categories.map(c => `<option value="${c}">`).join('')}</datalist>`;
    
    const content = `
        <form id="addProductForm">
            <div class="form-group"><label>Название</label><input type="text" id="prodName" required></div>
            <div class="form-group"><label>Описание</label><textarea id="prodDesc"></textarea></div>
            <div class="form-group"><label>Цена</label><input type="number" id="prodPrice" step="0.01" required></div>
            <div class="form-group"><label>Единица</label><input type="text" id="prodUnit" value="шт"></div>
            <div class="form-group"><label>Количество</label><input type="number" id="prodStock" value="10"></div>
            <div class="form-group"><label>Категория</label>
                <input type="text" id="prodCategory" list="${datalistId}" placeholder="Выберите или введите новую">
                ${datalistHtml}
            </div>
            <div class="form-group">
                <label>Изображение товара</label>
                <div id="productImageUploader"></div>
            </div>
        </form>
    `;
    
    openModal('Добавление товара', content, async () => {
        const name = document.getElementById('prodName').value;
        const description = document.getElementById('prodDesc').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const unit = document.getElementById('prodUnit').value;
        const stock = parseInt(document.getElementById('prodStock').value);
        const category = document.getElementById('prodCategory').value;
        const imageUrl = document.getElementById('prodImage').value;
        
        if (!name || !price) { alert('Заполните название и цену'); return; }
        
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, price, unit, stock, image: imageUrl, category })
        });
        if (res.ok) {
            alert('Товар добавлен');
            await refreshManagerProducts();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
    
    setTimeout(() => {
        initImageUploader('productImageUploader', 'prodImage', 'prodImagePreview', '');
    }, 200);
};

window.editProduct = async function(productId) {
    const products = await fetchProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return alert('Товар не найден');
    
    const categories = await fetchProductCategories();
    const datalistId = 'categoryList';
    const datalistHtml = `<datalist id="${datalistId}">${categories.map(c => `<option value="${c}">`).join('')}</datalist>`;
    
    const content = `
        <form id="editProductForm">
            <div class="form-group"><label>Название</label><input type="text" id="prodName" value="${escapeHtml(product.name)}" required></div>
            <div class="form-group"><label>Описание</label><textarea id="prodDesc">${escapeHtml(product.description || '')}</textarea></div>
            <div class="form-group"><label>Цена</label><input type="number" id="prodPrice" value="${product.price}" step="0.01" required></div>
            <div class="form-group"><label>Единица</label><input type="text" id="prodUnit" value="${escapeHtml(product.unit || 'шт')}"></div>
            <div class="form-group"><label>Количество</label><input type="number" id="prodStock" value="${product.stock}"></div>
            <div class="form-group"><label>Категория</label>
                <input type="text" id="prodCategory" list="${datalistId}" value="${escapeHtml(product.category || '')}" placeholder="Выберите или введите новую">
                ${datalistHtml}
            </div>
            <div class="form-group">
                <label>Изображение товара</label>
                <div id="productImageUploader"></div>
            </div>
        </form>
    `;
    
    openModal('Редактирование товара', content, async () => {
        const name = document.getElementById('prodName').value;
        const description = document.getElementById('prodDesc').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const unit = document.getElementById('prodUnit').value;
        const stock = parseInt(document.getElementById('prodStock').value);
        const category = document.getElementById('prodCategory').value;
        const imageUrl = document.getElementById('prodImage').value;
        
        const res = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, price, unit, stock, image: imageUrl, category })
        });
        if (res.ok) {
            alert('Товар обновлён');
            await refreshManagerProducts();
            closeModal();
        } else {
            alert('Ошибка');
        }
    });
    
    setTimeout(() => {
        initImageUploader('productImageUploader', 'prodImage', 'prodImagePreview', product.image || '');
    }, 200);
};

window.deleteProduct = async function(productId) {
    if (!confirm('Удалить товар?')) return;
    const res = await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Товар удалён');
        await refreshManagerProducts();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

async function refreshManagerProducts() {
    console.log('refreshManagerProducts: start');
    _allProducts = await fetchProducts();
    console.log('refreshManagerProducts: products loaded', _allProducts);
    
    const tableContainer = document.getElementById('managerProductsTable');
    if (tableContainer) {
        tableContainer.innerHTML = buildManagerProductsTable(_allProducts);
    } else {
        console.error('managerProductsTable not found in DOM');
    }
    
    const adminProductsTable = document.getElementById('adminProductsTable');
    if (adminProductsTable) {
        adminProductsTable.innerHTML = buildManagerProductsTable(_allProducts);
    }
}

window.editService = async function(serviceId) {
    const services = await fetchAllSubscriptions();
    const service = services.find(s => s.id === serviceId);
    if (!service) return alert('Услуга не найдена');

    const accessTypes = await fetchAllSubscriptionAccessTypes();
    const datalistId = 'accessTypeList';
    const datalistHtml = `<datalist id="${datalistId}">${accessTypes.map(t => `<option value="${t}">`).join('')}</datalist>`;

    const content = `
        <form id="editServiceForm">
            <div class="form-group"><label>Название</label><input type="text" id="servName" value="${service.name}" required></div>
            <div class="form-group"><label>Описание</label><textarea id="servDesc">${service.description || ''}</textarea></div>
            <div class="form-group"><label>Цена</label><input type="number" id="servPrice" value="${service.price}" step="0.01" required></div>
            <div class="form-group"><label>Срок (дней)</label><input type="number" id="servDuration" value="${service.duration}" required></div>
            <div class="form-group"><label>Тип доступа</label>
                <input type="text" id="servAccess" list="${datalistId}" value="${service.access || ''}" placeholder="Выберите или введите новый">
                ${datalistHtml}
            </div>
            <div class="form-group"><label>Активен</label>
                <input type="checkbox" id="servActive" ${service.is_active ? 'checked' : ''}>
            </div>
        </form>
    `;

    openModal('Редактирование услуги', content, async () => {
        const name = document.getElementById('servName').value;
        const description = document.getElementById('servDesc').value;
        const price = parseFloat(document.getElementById('servPrice').value);
        const duration = parseInt(document.getElementById('servDuration').value);
        const access = document.getElementById('servAccess').value;
        const is_active = document.getElementById('servActive').checked;

        const res = await fetch(`${API_URL}/subscriptions/${serviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, duration, price, access, is_active, user_id: getCurrentUser()?.id })
        });

        if (res.ok) {
            alert('Услуга обновлена');
            const user = getCurrentUser();
            if (user.role === 'Менеджер') {
                await refreshManagerServices();
            } else if (user.role === 'Администратор') {
                await refreshAdminServices();
            }
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });
};

window.deleteService = async function(serviceId) {
    if (!confirm('Удалить услугу?')) return;
    const res = await fetch(`${API_URL}/subscriptions/${serviceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: getCurrentUser()?.id })
    });
    if (res.ok) {
        alert('Услуга удалена');
        const user = getCurrentUser();
        if (user.role === 'Менеджер') {
            await refreshManagerServices();
        } else if (user.role === 'Администратор') {
            await refreshAdminServices();
        }
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

window.addClient = function() {
    const content = `
        <form id="addClientForm">
            <div class="form-group">
                <label>ФИО</label>
                <input type="text" id="clientName" required pattern="[А-Яа-яA-Za-z\\s-]+" title="Только буквы, пробел и дефис">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="clientEmail" required>
            </div>
            <div class="form-group">
                <label>Телефон</label>
                <input type="tel" id="clientPhone" required placeholder="+7 (999) 999-99-99">
            </div>
            <div class="form-group">
                <label>Пароль (временный)</label>
                <input type="text" id="clientPass" value="123" required>
            </div>
        </form>
    `;

    openModal('Добавление клиента', content, async () => {
        const name = document.getElementById('clientName').value;
        const email = document.getElementById('clientEmail').value;
        let phone = document.getElementById('clientPhone').value;
        const password = document.getElementById('clientPass').value;

        const nameRegex = /^[А-Яа-яA-Za-z\s-]+$/;
        if (!nameRegex.test(name)) {
            alert('ФИО может содержать только буквы, пробел и дефис');
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            alert('Введите корректный email');
            return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 11 && phoneDigits.length !== 10) {
            alert('Введите корректный номер телефона (10 или 11 цифр)');
            return;
        }
        const normalizedPhone = phoneDigits.length === 11 ? phoneDigits : '7' + phoneDigits;

        const res = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: name,
                email,
                phone: normalizedPhone,
                password,
                role_id: 3,
                photo_url: null
            })
        });

        if (res.ok) {
            await refreshManagerClients();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });

    setTimeout(() => {
        const phoneInput = document.getElementById('clientPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value[0] === '7' || value[0] === '8') {
                        value = value.substring(1);
                    }
                    const match = value.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
                    if (match) {
                        let formatted = '';
                        if (match[1]) formatted = `+7 (${match[1]}`;
                        if (match[2]) formatted += `) ${match[2]}`;
                        if (match[3]) formatted += `-${match[3]}`;
                        if (match[4]) formatted += `-${match[4]}`;
                        e.target.value = formatted;
                    }
                }
            });
        }
    }, 100);
};

function initImageUploader(containerId, urlInputId, previewContainerId, currentUrl = '') {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (container.dataset.initialized === 'true') return;
        container.dataset.initialized = 'true';
        
        container.innerHTML = `
            <div class="image-upload-wrapper">
                <div class="image-upload-tabs">
                    <button type="button" class="image-tab-btn active" data-method="url">Указать URL</button>
                    <button type="button" class="image-tab-btn" data-method="file">Загрузить файл</button>
                </div>
                <div class="image-upload-url-panel active">
                    <input type="text" id="${urlInputId}" placeholder="https://example.com/image.jpg" class="image-url-input" value="${escapeHtml(currentUrl)}">
                    <div id="${previewContainerId}_url_preview" style="margin-top:10px; display:${currentUrl ? 'block' : 'none'}">
                        <img src="${currentUrl}" style="max-width:150px; max-height:150px; border-radius:8px; border:1px solid #ddd; padding:4px;">
                        <button type="button" class="btn btn-sm" style="margin-top:5px;" onclick="document.getElementById('${urlInputId}').value=''; document.getElementById('${previewContainerId}_url_preview').style.display='none';">✖ Удалить</button>
                    </div>
                </div>
                <div class="image-upload-file-panel" style="display:none">
                    <div class="file-input-area">
                        <label class="btn btn-sm file-upload-label" style="cursor:pointer;">Выбрать файл
                            <input type="file" id="${containerId}_file" accept="image/*" style="display:none">
                        </label>
                        <div id="${previewContainerId}" class="image-preview" style="display:none">
                            <img id="${previewContainerId}_img" class="preview-img">
                            <span class="remove-preview" title="Удалить">✖</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const urlInput = document.getElementById(urlInputId);
        const urlPreviewDiv = document.getElementById(`${previewContainerId}_url_preview`);
        const tabBtns = container.querySelectorAll('.image-tab-btn');
        const urlPanel = container.querySelector('.image-upload-url-panel');
        const filePanel = container.querySelector('.image-upload-file-panel');
        const fileInput = document.getElementById(`${containerId}_file`);
        const previewDiv = document.getElementById(previewContainerId);
        const previewImg = document.getElementById(`${previewContainerId}_img`);
        const removeBtn = container.querySelector('.remove-preview');
        
        // Переключение вкладок
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.method === 'url') {
                    urlPanel.style.display = 'block';
                    filePanel.style.display = 'none';
                } else {
                    urlPanel.style.display = 'none';
                    filePanel.style.display = 'block';
                }
            });
        });
        
        // Обновление предпросмотра при ручном изменении URL
        urlInput.addEventListener('input', () => {
            const newUrl = urlInput.value;
            if (newUrl && urlPreviewDiv) {
                const img = urlPreviewDiv.querySelector('img');
                if (img) img.src = newUrl;
                urlPreviewDiv.style.display = 'block';
            } else if (urlPreviewDiv) {
                urlPreviewDiv.style.display = 'none';
            }
        });
        
        // Загрузка файла
        const fileLabel = container.querySelector('.file-upload-label');
        fileLabel.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async (e) => {
            e.stopPropagation();
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(ev) {
                previewImg.src = ev.target.result;
                previewDiv.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            try {
                const uploadedUrl = await uploadImage(file);
                urlInput.value = uploadedUrl;
                // Обновить предпросмотр в URL-панели
                if (urlPreviewDiv) {
                    const img = urlPreviewDiv.querySelector('img');
                    if (img) img.src = uploadedUrl;
                    urlPreviewDiv.style.display = 'block';
                }
                alert('Изображение загружено, URL вставлен в поле');
            } catch (err) {
                alert('Ошибка загрузки: ' + err.message);
                previewDiv.style.display = 'none';
                fileInput.value = '';
            }
        });
        
        // Удаление предпросмотра
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                previewDiv.style.display = 'none';
                fileInput.value = '';
                urlInput.value = '';
                if (urlPreviewDiv) urlPreviewDiv.style.display = 'none';
            });
        }
        
        // Если есть текущий URL, показываем предпросмотр в URL-панели (дублируем для надёжности)
        if (currentUrl && urlPreviewDiv) {
            const img = urlPreviewDiv.querySelector('img');
            if (img) img.src = currentUrl;
            urlPreviewDiv.style.display = 'block';
        }
    }, 200);
}

// Добавление пользователя (с выбором роли)
window.addUserItem = function() {
    const content = `
        <form id="addUserForm">
            <div class="form-group"><label>ФИО</label><input type="text" id="userName" required></div>
            <div class="form-group"><label>Email</label><input type="email" id="userEmail" required></div>
            <div class="form-group"><label>Телефон</label><input type="tel" id="userPhone" required placeholder="+7 (999) 999-99-99"></div>
            <div class="form-group"><label>Пароль (временный)</label><input type="text" id="userPass" value="123"></div>
            <div class="form-group"><label>Роль</label>
                <select id="userRole">
                    <option value="1">Администратор</option>
                    <option value="2">Тренер</option>
                    <option value="3">Клиент</option>
                    <option value="4">Менеджер</option>
                </select>
            </div>
            <div class="form-group"><label>Фото (URL)</label><input type="text" id="userPhoto"></div>
        </form>
    `;
    openModal('Добавление пользователя', content, async () => {
        const full_name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        let phone = document.getElementById('userPhone').value;
        const password = document.getElementById('userPass').value;
        const role_id = parseInt(document.getElementById('userRole').value);
        const photo_url = document.getElementById('userPhoto').value;

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 11 && phoneDigits.length !== 10) {
            alert('Введите корректный номер телефона (10 или 11 цифр)');
            return;
        }
        const normalizedPhone = phoneDigits.length === 11 ? phoneDigits : '7' + phoneDigits;

        const res = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, phone: normalizedPhone, password, role_id, photo_url })
        });

        if (res.ok) {
            alert('Пользователь добавлен');
            await refreshAdminUsers();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });

    setTimeout(() => {
        const phoneInput = document.getElementById('userPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value[0] === '7' || value[0] === '8') {
                        value = value.substring(1);
                    }
                    const match = value.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
                    if (match) {
                        let formatted = '';
                        if (match[1]) formatted = `+7 (${match[1]}`;
                        if (match[2]) formatted += `) ${match[2]}`;
                        if (match[3]) formatted += `-${match[3]}`;
                        if (match[4]) formatted += `-${match[4]}`;
                        e.target.value = formatted;
                    }
                }
            });
        }
    }, 100);
};

window.editUser = async function(userId) {
    const users = await fetchAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return alert('Пользователь не найден');

    let roleId = 3;
    if (user.role === 'Администратор') roleId = 1;
    else if (user.role === 'Тренер') roleId = 2;
    else if (user.role === 'Клиент') roleId = 3;
    else if (user.role === 'Менеджер') roleId = 4;

    const content = `
        <form id="editUserForm">
            <div class="form-group"><label>ФИО</label><input type="text" id="userName" value="${user.name}" required></div>
            <div class="form-group"><label>Email</label><input type="email" id="userEmail" value="${user.email}" required></div>
            <div class="form-group"><label>Телефон</label><input type="tel" id="userPhone" value="${user.phone}" required placeholder="+7 (999) 999-99-99"></div>
            <div class="form-group"><label>Роль</label>
                <select id="userRole">
                    <option value="1" ${roleId === 1 ? 'selected' : ''}>Администратор</option>
                    <option value="2" ${roleId === 2 ? 'selected' : ''}>Тренер</option>
                    <option value="3" ${roleId === 3 ? 'selected' : ''}>Клиент</option>
                    <option value="4" ${roleId === 4 ? 'selected' : ''}>Менеджер</option>
                </select>
            </div>
            <div class="form-group"><label>Активен</label>
                <input type="checkbox" id="userActive" ${user.is_active ? 'checked' : ''}>
            </div>
        </form>
    `;

    openModal('Редактирование пользователя', content, async () => {
        const full_name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        let phone = document.getElementById('userPhone').value;
        const role_id = parseInt(document.getElementById('userRole').value);
        const is_active = document.getElementById('userActive').checked;

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 11 && phoneDigits.length !== 10) {
            alert('Введите корректный номер телефона (10 или 11 цифр)');
            return;
        }
        const normalizedPhone = phoneDigits.length === 11 ? phoneDigits : '7' + phoneDigits;

        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, phone: normalizedPhone, role_id, is_active, user_id: getCurrentUser()?.id })
});

        if (res.ok) {
            alert('Пользователь обновлён');
            await refreshAdminUsers();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });

    setTimeout(() => {
        const phoneInput = document.getElementById('userPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value[0] === '7' || value[0] === '8') {
                        value = value.substring(1);
                    }
                    const match = value.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
                    if (match) {
                        let formatted = '';
                        if (match[1]) formatted = `+7 (${match[1]}`;
                        if (match[2]) formatted += `) ${match[2]}`;
                        if (match[3]) formatted += `-${match[3]}`;
                        if (match[4]) formatted += `-${match[4]}`;
                        e.target.value = formatted;
                    }
                }
            });
        }
    }, 100);
};

window.toggleBlockUser = async function(userId) {
    if (!confirm('Изменить статус блокировки?')) return;
    const res = await fetch(`${API_URL}/admin/users/${userId}/toggle-block`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: getCurrentUser()?.id })
});
    if (res.ok) {
        alert('Статус изменён');
        await refreshAdminUsers();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

window.editClient = async function(clientId) {
    const clients = await fetchAllClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return alert('Клиент не найден');

    const content = `
        <form id="editClientForm">
            <div class="form-group">
                <label>ФИО</label>
                <input type="text" id="clientName" value="${client.name}" required pattern="[А-Яа-яA-Za-z\\s-]+" title="Только буквы, пробел и дефис">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="clientEmail" value="${client.email}" required>
            </div>
            <div class="form-group">
                <label>Телефон</label>
                <input type="tel" id="clientPhone" value="${client.phone}" required placeholder="+7 (999) 999-99-99">
            </div>
        </form>
    `;

    openModal('Редактирование клиента', content, async () => {
        const name = document.getElementById('clientName').value;
        const email = document.getElementById('clientEmail').value;
        let phone = document.getElementById('clientPhone').value;

        const nameRegex = /^[А-Яа-яA-Za-z\s-]+$/;
        if (!nameRegex.test(name)) {
            alert('ФИО может содержать только буквы, пробел и дефис');
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            alert('Введите корректный email');
            return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 11 && phoneDigits.length !== 10) {
            alert('Введите корректный номер телефона (10 или 11 цифр)');
            return;
        }
        const normalizedPhone = phoneDigits.length === 11 ? phoneDigits : '7' + phoneDigits;

        const res = await fetch(`${API_URL}/admin/users/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: name,
                email,
                phone: normalizedPhone,
                role_id: 3,
                is_active: client.is_active
            })
        });

        if (res.ok) {
            await refreshManagerClients();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + err.error);
        }
    });

    setTimeout(() => {
        const phoneInput = document.getElementById('clientPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value[0] === '7' || value[0] === '8') {
                        value = value.substring(1);
                    }
                    const match = value.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
                    if (match) {
                        let formatted = '';
                        if (match[1]) formatted = `+7 (${match[1]}`;
                        if (match[2]) formatted += `) ${match[2]}`;
                        if (match[3]) formatted += `-${match[3]}`;
                        if (match[4]) formatted += `-${match[4]}`;
                        e.target.value = formatted;
                    }
                }
            });
        }
    }, 100);
};

window.toggleBlockClient = async function(clientId) {
    if (!confirm('Изменить статус блокировки?')) return;
    const res = await fetch(`${API_URL}/admin/users/${clientId}/toggle-block`, { method: 'PATCH' });
    if (res.ok) {
        await refreshManagerClients();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};  

window.editTraining = async function(trainingId) {
    const user = getCurrentUser();
    const isManager = user.role === 'Менеджер';
    if (!isManager) return;

    const res = await fetch(`${API_URL}/trainings/${trainingId}`);
    if (!res.ok) return alert('Не удалось загрузить данные тренировки');
    const training = await res.json();

    const trainersRes = await fetch(`${API_URL}/trainers/all`);
    const trainers = await trainersRes.json();
    const trainerOptions = trainers.map(t => `<option value="${t.id}" ${t.id === training.trainer_id ? 'selected' : ''}>${t.name}</option>`).join('');

    // Группы тренировок
    let groupTypes = [];
    const groupTypesRes = await fetch(`${API_URL}/group-training-types/all`);
    if (groupTypesRes.ok) {
        groupTypes = await groupTypesRes.json();
    }
    const groupOptions = groupTypes.map(gt => `<option value="${gt.id}" ${gt.id === training.group_type_id ? 'selected' : ''}>${gt.name}</option>`).join('');

    // Преобразуем UTC в локальное время для поля datetime-local
    const start = new Date(training.start_time);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    const startLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

    const end = new Date(training.end_time);
    const duration = (end - start) / 60000;

    const typeHtml = `
        <div class="form-group">
            <label>Тип тренировки:</label>
            <select id="trainingTypeSelect" required>
                <option value="персональная" ${training.type === 'персональная' ? 'selected' : ''}>Персональная (тренажёрный зал)</option>
                <option value="групповая" ${training.type === 'групповая' ? 'selected' : ''}>Групповая</option>
            </select>
        </div>
    `;

    const personalHtml = `
        <div id="personalFields" class="training-type-fields" style="display: ${training.type === 'персональная' ? 'block' : 'none'};">
            <div class="form-group"><label>Цена (₽ за час)</label><input type="number" id="personalPrice" value="${training.price || 1500}" min="0" step="10"></div>
        </div>
    `;

    const groupHtml = `
        <div id="groupFields" class="training-type-fields" style="display: ${training.type === 'групповая' ? 'block' : 'none'};">
            <div class="form-group">
                <label>Группа тренировок</label>
                <select id="groupTypeId">
                    <option value="">-- Без группы --</option>
                    ${groupOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Название</label>
                <input type="text" id="groupName" value="${training.name}" required>
            </div>
            <div class="form-group"><label>Зал</label><input type="text" id="groupRoom" value="${training.room || 'Зал 1'}"></div>
            <div class="form-group"><label>Макс. участников</label><input type="number" id="groupMax" value="${training.max_participants || 10}" min="1"></div>
            <div class="form-group"><label>Цена (₽)</label><input type="number" id="groupPrice" value="${training.price || 500}" min="0" step="10"></div>
        </div>
    `;

    const content = `
        <form id="editTrainingForm">
            <div class="form-group"><label>Тренер</label>
                <select id="trainingTrainer">${trainerOptions}</select>
            </div>
            ${typeHtml}
            ${personalHtml}
            ${groupHtml}
            <div class="form-group"><label>Дата и время начала</label><input type="datetime-local" id="trainingStart" value="${startLocal}" required></div>
            <div class="form-group"><label>Длительность (минут)</label><input type="number" id="trainingDuration" value="${duration}" min="15" step="15"></div>
        </form>
    `;

    openModal('Редактирование тренировки', content, async () => {
        const trainer_id = parseInt(document.getElementById('trainingTrainer').value, 10);
        const type = document.getElementById('trainingTypeSelect').value;
        const start = document.getElementById('trainingStart').value;
        const duration = parseInt(document.getElementById('trainingDuration').value);
        if (!start) return alert('Заполните дату и время');

        const startDate = new Date(start);
        const endDate = new Date(startDate.getTime() + duration * 60000);

        let name, room, max_participants, price, group_type_id = null;

        if (type === 'персональная') {
            name = 'Персональная тренировка';
            room = 'По договоренности';
            max_participants = 1;
            price = parseInt(document.getElementById('personalPrice').value);
        } else {
            group_type_id = document.getElementById('groupTypeId').value;
            if (group_type_id === '') group_type_id = null;
            name = document.getElementById('groupName').value;
            if (!name) return alert('Введите название групповой тренировки');
            room = document.getElementById('groupRoom').value;
            max_participants = parseInt(document.getElementById('groupMax').value);
            price = parseInt(document.getElementById('groupPrice').value);
        }

        const updateRes = await fetch(`${API_URL}/trainings/${trainingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                trainer_id: trainer_id,
                name: name,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                max_participants: max_participants,
                room: room,
                price: price,
                group_type_id: group_type_id,
                status: training.status
            })
        });

        if (updateRes.ok) {
            alert('Тренировка обновлена');
            await refreshManagerTrainings();
            closeModal();
        } else {
            const err = await updateRes.json();
            alert('Ошибка: ' + err.error);
        }
    });

    // Переключение полей при смене типа
    setTimeout(() => {
        const typeSelect = document.getElementById('trainingTypeSelect');
        const personalDiv = document.getElementById('personalFields');
        const groupDiv = document.getElementById('groupFields');
        if (typeSelect) {
            const toggle = () => {
                if (typeSelect.value === 'персональная') {
                    personalDiv.style.display = 'block';
                    groupDiv.style.display = 'none';
                } else {
                    personalDiv.style.display = 'none';
                    groupDiv.style.display = 'block';
                }
            };
            typeSelect.addEventListener('change', toggle);
            toggle();
        }
    }, 100);
};


window.cancelTrainerSession = async function(sessionId) {
    if (!confirm('Отменить тренировку? Клиенты будут уведомлены.')) return;
    const user = getCurrentUser();
    const res = await fetch(`${API_URL}/trainings/${sessionId}/cancel`, { method: 'PUT' });
    if (res.ok) {
        alert('Тренировка отменена');
        await refreshTrainerSchedule();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + err.error);
    }
};

async function refreshTrainerSchedule() {
    const user = getCurrentUser();
    const newSchedule = await fetchTrainerSchedule(user.id);
    _allSchedule = newSchedule;
    const filtered = newSchedule.filter(s => s.date.split(' ')[0] === _selectedDate);
    const tableContainer = document.getElementById('trainerScheduleTable');
    if (tableContainer) {
        tableContainer.innerHTML = buildTrainerScheduleTable(filtered);
    }
}

window.editTrainerSession = async function(sessionId) {
    const session = _allSchedule.find(s => s.id === sessionId);
    if (!session) return alert('Сессия не найдена');
    
    const sessionRes = await fetch(`${API_URL}/trainings/${sessionId}`);
    if (!sessionRes.ok) return alert('Не удалось загрузить данные сессии');
    const fullSession = await sessionRes.json();
    
    const startUTC = new Date(fullSession.start_time);
    const endUTC = new Date(fullSession.end_time);
    const duration = (endUTC - startUTC) / 60000;
    
    // Преобразуем UTC в локальное время для datetime-local
    const year = startUTC.getFullYear();
    const month = String(startUTC.getMonth() + 1).padStart(2, '0');
    const day = String(startUTC.getDate()).padStart(2, '0');
    const hours = String(startUTC.getHours()).padStart(2, '0');
    const minutes = String(startUTC.getMinutes()).padStart(2, '0');
    const startLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    const room = fullSession.room || '';
    const max = fullSession.max_participants || 1;
    const type = fullSession.type;

    const content = `
        <form id="editSessionForm">
            <div class="form-group"><label>Название</label><input type="text" id="sessionName" value="${fullSession.name}" required></div>
            <div class="form-group"><label>Дата и время</label><input type="datetime-local" id="sessionStart" value="${startLocal}" required></div>
            <div class="form-group"><label>Длительность (минут)</label><input type="number" id="sessionDuration" value="${duration}" min="15" step="15"></div>
            <div class="form-group"><label>Зал</label><input type="text" id="sessionRoom" value="${room}"></div>
            <div class="form-group"><label>Макс. участников</label><input type="number" id="sessionMax" value="${max}" min="1"></div>
        </form>
    `;
    openModal('Редактирование тренировки', content, async () => {
        const name = document.getElementById('sessionName').value;
        const startStr = document.getElementById('sessionStart').value;
        const duration = parseInt(document.getElementById('sessionDuration').value);
        const room = document.getElementById('sessionRoom').value;
        const max = parseInt(document.getElementById('sessionMax').value);
        if (!name || !startStr) return alert('Заполните поля');
        
        // startStr - локальное время, преобразуем в UTC для отправки
        const startDate = new Date(startStr);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        
        const res = await fetch(`${API_URL}/trainings/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                max_participants: max,
                room,
                type: type
            })
        });
        if (res.ok) {
            alert('Тренировка обновлена');
            await refreshTrainerSchedule();
            closeModal();
        } else {
            const err = await res.json();
            alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
        }
    });
};

window.messageClient = (id) => alert('Написать клиенту ' + id);
window.editScheduleItem = (id) => alert('Редактирование расписания ' + id);


window.editSetting = async function(key) {
    const setting = _allSettings.find(s => s.key === key);
    if (!setting) {
        alert('Настройка не найдена');
        return;
    }
    const currentValue = typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : setting.value;
    const content = `
        <form id="editSettingForm">
            <div class="form-group">
                <label>Ключ (не редактируется)</label>
                <input type="text" value="${setting.key}" disabled>
            </div>
            <div class="form-group">
                <label>Значение</label>
                <textarea id="settingValue" rows="3" required>${currentValue}</textarea>
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="settingDescription" rows="2">${setting.description || ''}</textarea>
            </div>
        </form>
    `;
    openModal('Редактирование настройки', content, async () => {
        let value = document.getElementById('settingValue').value.trim();
        const description = document.getElementById('settingDescription').value.trim();

        if (!value) {
            alert('Введите значение');
            return;
        }

        let parsedValue;
        try {
            parsedValue = JSON.parse(value);
        } catch (e) {
            parsedValue = value;
        }

        try {
            await updateSystemSetting(key, parsedValue, description);
            alert('Настройка обновлена');
            await refreshAdminSettings();
            closeModal();
        } catch (err) {
            alert(err.message);
        }
    });
};

window.selectedGuestClient = null;


window.selectClientForGuestCode = function(id, name, phone, email) {
    selectedGuestClient = { id, name, phone, email };
    document.getElementById('guestName').value = name;
    document.getElementById('guestPhone').value = phone;
    document.getElementById('guestEmail').value = email || '';
    alert(`Выбран клиент: ${name}`);
};

async function loadTodayVisits() {
    try {
        const res = await fetch(`${API_URL}/admin/daily-visits`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        const span = document.getElementById('todayVisitsCount');
        if (span) span.innerText = data.count;
    } catch (err) {
        console.error(err);
        const span = document.getElementById('todayVisitsCount');
        if (span) span.innerText = 'Ошибка';
    }
}

window.generateGuestCode = async function() {
    const duration = parseInt(document.getElementById('guestDuration').value, 10);
    let clientData = {};

    if (selectedGuestClient) {
        clientData = {
            client_id: selectedGuestClient.id,
            name: selectedGuestClient.name,
            phone: selectedGuestClient.phone,
            email: selectedGuestClient.email || ''
        };
    } else {
        const name = document.getElementById('guestName').value;
        const phone = document.getElementById('guestPhone').value;
        const email = document.getElementById('guestEmail').value;
        if (!name || !phone || !email) {
            alert('Заполните все поля нового клиента');
            return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
if (phoneDigits.length !== 11 && phoneDigits.length !== 10) {
    alert('Введите корректный номер телефона (10 или 11 цифр)');
    return;
}
const normalizedPhone = phoneDigits.length === 11 ? phoneDigits : '7' + phoneDigits;
        clientData = { name, phone: normalizedPhone, email };
    }

    try {
        const res = await fetch(`${API_URL}/guest-codes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientData.client_id,
                name: clientData.name,
                phone: clientData.phone,
                email: clientData.email,
                duration: duration
            })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Ошибка генерации кода');
            return;
        }
        document.getElementById('guestCodeResult').innerHTML = `
            <div class="card" style="padding:15px;">
                <p><strong>Код:</strong> ${data.code}</p>
                <p>Для: ${clientData.name} (${clientData.phone})</p>
                <p>Email: ${clientData.email}</p>
                <p>Срок: ${duration} дней</p>
                <p>Действителен до: ${new Date(data.valid_until).toLocaleDateString('ru-RU')}</p>
            </div>
        `;
        
        // Если был создан новый клиент – обновляем таблицу клиентов
        if (!clientData.client_id) {
            await refreshManagerClients();
        }
        
        // Сброс выбранного клиента
        selectedGuestClient = null;
        document.getElementById('guestName').value = '';
        document.getElementById('guestPhone').value = '';
        document.getElementById('guestEmail').value = '';
    } catch (err) {
        console.error(err);
        alert('Ошибка соединения с сервером');
    }
};

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text);
    alert('Код скопирован в буфер обмена');
};

document.addEventListener('DOMContentLoaded', async function() {
    await initAuth();    
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await renderProfile(user);
});