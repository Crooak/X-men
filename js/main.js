// js/main.js

// Глобальные переменные
let currentTrainerId = null;
let currentTrainerName = '';
let _userBookedSessions = [];
let _scheduleCurrentDate = new Date().toISOString().split('T')[0];
let _allScheduleEvents = [];

function updateHeader() {
    const authButtons = document.getElementById('authButtons');
    if (!authButtons) return;
    const user = getCurrentUser();
    if (user) {
        const cartCount = getCartTotalCount();
        authButtons.innerHTML = `
            <span class="user-greeting">${user.name.split(' ')[0]} (${getRoleNameShort(user.role)})</span>
            <a href="cart.html" class="cart-icon">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                ${cartCount > 0 ? `<span class="cart-count">${cartCount}</span>` : ''}
            </a>
            <a href="profile.html" class="btn">Личный кабинет</a>
        `;
    } else {
        authButtons.innerHTML = `
            <a href="login.html" class="btn">Личный кабинет</a>
        `;
    }
}

function getRoleNameShort(role) {
    const roles = { 'Клиент': 'Клиент', 'Тренер': 'Тренер', 'Менеджер': 'Менеджер', 'Администратор': 'Админ' };
    return roles[role] || role;
}

function requireAuth() {
    if (!getCurrentUser()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('nav ul');
    if (navMenu) navMenu.classList.toggle('active');
}

// Предпросмотр на главной
async function loadTrainersPreview() {
    const container = document.getElementById('trainersPreview');
    if (!container) return;
    const trainers = await fetchTrainers();
    const preview = trainers.slice(0, 3);
    container.innerHTML = preview.map(t => `
        <div class="card">
            <img src="${t.photo || 'https://via.placeholder.com/300'}" alt="${t.name}" class="card-img">
            <div class="card-body">
                <h3 class="card-title">${t.name}</h3>
                <p class="card-text">${t.specialization} | Рейтинг: ${t.rating}</p>
                <p>${t.bio}</p>
            </div>
            <div class="card-footer">
                <a href="trainers.html" class="btn">Подробнее</a>
            </div>
        </div>
    `).join('');
}

async function loadProductsPreview() {
    const container = document.getElementById('productsPreview');
    if (!container) return;
    const products = await fetchProducts();
    const preview = products.slice(0, 3);
    container.innerHTML = preview.map(p => `
        <div class="card">
            <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}" class="card-img">
            <div class="card-body">
                <h3 class="card-title">${p.name}</h3>
                <p class="card-text">${p.price} ₽ / ${p.unit} | В наличии: ${p.stock}</p>
            </div>
            <div class="card-footer">
                <button class="btn add-to-cart" 
                    data-id="${p.id}" 
                    data-name="${p.name}" 
                    data-price="${p.price}" 
                    data-image="${p.image || ''}" 
                    data-unit="${p.unit}" 
                    data-stock="${p.stock}">
                    В корзину
                </button>
            </div>
        </div>
    `).join('');
}

// Фильтры для услуг
async function loadServiceFilters() {
    const accessSelect = document.getElementById('serviceAccessFilter');
    const durationSelect = document.getElementById('serviceDurationFilter');

    if (accessSelect) {
        const accessTypes = await fetchSubscriptionAccessTypes();
        accessSelect.innerHTML = '<option value="all">Все типы доступа</option>';
        accessTypes.forEach(access => {
            const option = document.createElement('option');
            option.value = access;
            option.textContent = access;
            accessSelect.appendChild(option);
        });
    }

    if (durationSelect) {
        const durations = await fetchSubscriptionDurations();
        durationSelect.innerHTML = '<option value="all">Все сроки</option>';
        durations.forEach(dur => {
            const option = document.createElement('option');
            option.value = dur;
            option.textContent = dur + ' дней';
            durationSelect.appendChild(option);
        });
    }
}

async function loadCategoryFilter() {
    const filter = document.getElementById('productCategoryFilter');
    if (!filter) return;
    const categories = await fetchProductCategories();
    filter.innerHTML = '<option value="all">Все</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filter.appendChild(option);
    });
}

async function loadSpecializationsFilter() {
    const filter = document.getElementById('trainerSpecializationFilter');
    if (!filter) return;
    const specializations = await fetchAllSpecializations();
    filter.innerHTML = '<option value="all">Все</option>';
    specializations.forEach(spec => {
        const option = document.createElement('option');
        option.value = spec.name;
        option.textContent = spec.name;
        filter.appendChild(option);
    });
}

// Страница товаров
async function loadProducts(filters = {}) {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    let products = await fetchProducts();
    if (filters.category && filters.category !== 'all') {
        products = products.filter(p => p.category === filters.category);
    }
    if (filters.sort === 'price_asc') {
        products.sort((a, b) => a.price - b.price);
    } else if (filters.sort === 'price_desc') {
        products.sort((a, b) => b.price - a.price);
    }
    container.innerHTML = products.map(p => {
        const qty = getProductQuantity(p.id);
        if (qty > 0) {
            return `
                <div class="card">
                    <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}" class="card-img">
                    <div class="card-body">
                        <h3 class="card-title">${p.name}</h3>
                        <p class="card-text">Цена: ${p.price} ₽ / ${p.unit} | В наличии: ${p.stock}</p>
                        ${p.category ? `<p><small>Категория: ${p.category}</small></p>` : ''}
                    </div>
                    <div class="card-footer">
                        <div class="cart-control">
                            <button class="btn btn-sm" onclick="decrementProduct(${p.id})">-</button>
                            <span>${qty} шт.</span>
                            <button class="btn btn-sm" onclick="incrementProduct(${p.id})">+</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="card">
                    <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}" class="card-img">
                    <div class="card-body">
                        <h3 class="card-title">${p.name}</h3>
                        <p class="card-text">Цена: ${p.price} ₽ / ${p.unit} | В наличии: ${p.stock}</p>
                        ${p.category ? `<p><small>Категория: ${p.category}</small></p>` : ''}
                    </div>
                    <div class="card-footer">
                        <button class="btn add-to-cart" 
                            data-id="${p.id}" 
                            data-name="${p.name}" 
                            data-price="${p.price}" 
                            data-image="${p.image || ''}" 
                            data-unit="${p.unit}" 
                            data-stock="${p.stock}">
                            В корзину
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

window.incrementProduct = function(productId) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId && i.type === 'product');
    if (item) {
        item.quantity++;
        saveCart(cart);
        loadProducts();
    }
};

window.decrementProduct = function(productId) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId && i.type === 'product');
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
            saveCart(cart);
        } else {
            removeFromCart(item.id);
        }
        loadProducts();
    }
};

// Страница услуг
async function loadServices(filters = {}) {
    const container = document.getElementById('servicesGrid');
    if (!container) return;

    let services = await fetchSubscriptions();

    if (filters.access && filters.access !== 'all') {
        services = services.filter(s => s.access === filters.access);
    }
    if (filters.duration && filters.duration !== 'all') {
        services = services.filter(s => s.duration == filters.duration);
    }
    if (filters.sort === 'price_asc') {
        services.sort((a, b) => a.price - b.price);
    } else if (filters.sort === 'price_desc') {
        services.sort((a, b) => b.price - a.price);
    }

    const subscriptionInCart = getCart().find(item => item.type === 'subscription');

    container.innerHTML = services.map(s => {
        const isInCart = subscriptionInCart && subscriptionInCart.id === s.id;
        if (isInCart) {
            return `
                <div class="card">
                    <div class="card-body">
                        <h3 class="card-title">${s.name}</h3>
                        <p class="card-text">${s.description}</p>
                        <p><strong>${s.price} ₽</strong> / ${s.duration} дней</p>
                        <p>Доступ: ${s.access}</p>
                    </div>
                    <div class="card-footer">
                        <div class="cart-control">
                            <button class="btn btn-sm" onclick="removeSubscriptionFromCart(${s.id})">-</button>
                            <span>1 шт.</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="card">
                    <div class="card-body">
                        <h3 class="card-title">${s.name}</h3>
                        <p class="card-text">${s.description}</p>
                        <p><strong>${s.price} ₽</strong> / ${s.duration} дней</p>
                        <p>Доступ: ${s.access}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn" onclick="buyService(${s.id})">Купить</button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

window.removeSubscriptionFromCart = function(subscriptionId) {
    const cart = getCart();
    const newCart = cart.filter(item => !(item.type === 'subscription' && item.id === subscriptionId));
    saveCart(newCart);
    loadServices();
};

window.buyService = async function(id) {
    if (!requireAuth()) return;
    const user = getCurrentUser();
    if (user.role !== 'Клиент') {
        alert('Только клиенты могут покупать абонементы');
        return;
    }
    const hasActive = await checkActiveSubscription(user.id);
    if (hasActive) {
        alert('У вас уже есть активный абонемент');
        return;
    }
    const services = await fetchSubscriptions();
    const service = services.find(s => s.id === id);
    if (!service) return;
    addToCart({ ...service, type: 'subscription' });
    loadServices();
};

// Страница тренеров
async function loadTrainers(filters = {}) {
    const container = document.getElementById('trainersGrid');
    if (!container) return;
    let trainers = await fetchTrainers();
    if (filters.specialization && filters.specialization !== 'all') {
        trainers = trainers.filter(t => t.specialization && t.specialization.includes(filters.specialization));
    }
    if (filters.sort === 'rating_desc') {
        trainers.sort((a, b) => b.rating - a.rating);
    }
    container.innerHTML = trainers.map(t => {
        const safeName = t.name.replace(/'/g, "\\'");
        const rate = t.hourly_rate ? `${t.hourly_rate} ₽/час` : 'Не указана';
        return `
            <div class="card">
                <img src="${t.photo || 'https://via.placeholder.com/300'}" alt="${t.name}" class="card-img">
                <div class="card-body">
                    <h3 class="card-title">${t.name}</h3>
                    <p class="card-text">${t.specialization}</p>
                    <p>Рейтинг: ${t.rating}</p>
                    <p>${t.bio}</p>
                    <p><strong>Цена за час:</strong> ${rate}</p>
                </div>
                <div class="card-footer">
                    <button class="btn" onclick="openBookingModal(${t.id}, '${safeName}')">Записаться</button>
                </div>
            </div>
        `;
    }).join('');
}

// Модальное окно тренера
window.openBookingModal = async function(trainerId, trainerName) {
    if (!requireAuth()) return;
    const user = getCurrentUser();
    if (user.role !== 'Клиент') {
        alert('Только клиенты могут записываться к тренерам');
        return;
    }
    const rateRes = await fetch(`${API_URL}/trainer/${trainerId}/hourly-rate`);
if (rateRes.ok) {
    const rateData = await rateRes.json();
    window.currentTrainerHourlyRate = rateData.hourly_rate || 1500;
} else {
    window.currentTrainerHourlyRate = 1500;
}
    currentTrainerId = trainerId;
    currentTrainerName = trainerName;
    const slots = await fetchAvailableSlots(trainerId);
    const cartSessionIds = getCart().filter(item => item.type === 'training').map(item => item.sessionId);
    const oldModal = document.getElementById('bookingModal');
    if (oldModal) oldModal.remove();
    createBookingModal(slots, trainerName, cartSessionIds);
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'block';
};

function createBookingModal(slots, trainerName, cartSessionIds) {
    const slotsByDate = {};
    slots.forEach(slot => {
        if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
        slotsByDate[slot.date].push(slot);
    });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
        const weekday = weekdays[d.getDay()];
        const day = d.getDate();
        const month = d.getMonth() + 1;
        return `${weekday}, ${day} ${month.toString().padStart(2, '0')}`;
    };

    let slotsHtml = '';
    if (slots.length === 0) {
        slotsHtml = '<p class="no-slots">Нет свободных слотов на ближайшие 7 дней</p>';
    } else {
        for (const [date, daySlots] of Object.entries(slotsByDate)) {
            slotsHtml += `<div class="slot-group"><h4>${formatDate(date)}</h4>`;
            daySlots.forEach(slot => {
                const isInCart = cartSessionIds.includes(slot.id);
                const disabledAttr = isInCart ? 'disabled' : '';
                const disabledClass = isInCart ? 'slot-disabled' : '';
                const title = isInCart ? 'Это время уже в корзине' : '';
                slotsHtml += `
                    <label class="slot-card ${disabledClass}" title="${title}">
                        <input type="radio" name="bookingSlot" value="${slot.id}" data-start="${slot.start}" data-end="${slot.end}" ${disabledAttr}>
                        <span class="slot-time">${slot.time}</span>
                    </label>
                `;
            });
            slotsHtml += '</div>';
        }
    }

    const modalHTML = `
        <div id="bookingModal" class="modal booking-modal">
            <div class="modal-content">
                <span class="close-modal" onclick="closeBookingModal()">&times;</span>
                <h3>Запись к тренеру ${trainerName}</h3>
                <div class="slots-container">
                    ${slotsHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="confirmBooking()" ${slots.length === 0 ? 'disabled' : ''}>Записаться</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'none';
}

window.confirmBooking = async function() {
    const selectedRadio = document.querySelector('input[name="bookingSlot"]:checked');
    if (!selectedRadio) {
        alert('Выберите время');
        return;
    }
    const sessionId = parseInt(selectedRadio.value);
    const start = selectedRadio.dataset.start;
    const end = selectedRadio.dataset.end;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationHours = (endDate - startDate) / (1000 * 60 * 60);
    const price = Math.round(window.currentTrainerHourlyRate * durationHours);

    const formattedDate = startDate.toLocaleDateString('ru-RU');
    const formattedStart = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const formattedEnd = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const timeRange = `${formattedStart} - ${formattedEnd}`;

    // Запрос фото тренера
    let trainerPhoto = '';
    try {
        const trainerRes = await fetch(`${API_URL}/trainers/${currentTrainerId}`);
        if (trainerRes.ok) {
            const trainerData = await trainerRes.json();
            trainerPhoto = trainerData.photo || '';
        }
    } catch(e) {
        console.error('Ошибка загрузки фото тренера:', e);
    }

    addToCart({
        id: `trainer_${currentTrainerId}_${Date.now()}`,
        name: `Тренировка с ${currentTrainerName}`,
        price: price,
        time: `${formattedDate} ${timeRange}`,
        timeRange: timeRange,
        date: formattedDate,
        trainer: currentTrainerName,
        type: 'training',
        sessionId: sessionId,
        trainerId: currentTrainerId,
        startTime: start,
        endTime: end,
        image: trainerPhoto || 'https://via.placeholder.com/80?text=Personal+Training'
    });
    closeBookingModal();
    if (typeof applyScheduleFiltersAndRender === 'function') {
        applyScheduleFiltersAndRender();
    }
};

// Страница расписания
async function loadUserBookings() {
    const user = getCurrentUser();
    if (user && user.role === 'Клиент') {
        const trainings = await fetchClientTrainings(user.id);
        _userBookedSessions = trainings
            .filter(t => t.status === 'подтверждено')
            .map(t => Number(t.session_id));
    } else {
        _userBookedSessions = [];
    }
}

async function loadScheduleFilters() {
    const trainerSet = new Set();
    _allScheduleEvents.forEach(e => trainerSet.add(e.trainer));
    const trainers = Array.from(trainerSet).sort();

    const trainerSelect = document.getElementById('scheduleTrainerFilter');
    if (trainerSelect) {
        trainerSelect.innerHTML = '<option value="all">Все</option>';
        trainers.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            trainerSelect.appendChild(option);
        });
    }

    const names = await fetchGroupTrainingNames();
    const typeSelect = document.getElementById('scheduleTypeFilter');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="all">Все</option>';
        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            typeSelect.appendChild(option);
        });
    }
}

async function applyScheduleFiltersAndRender() {
    await loadUserBookings();

    const container = document.getElementById('scheduleGrid');
    if (!container) return;

    let events = _allScheduleEvents;

    const trainerValue = document.getElementById('scheduleTrainerFilter')?.value || 'all';
    if (trainerValue !== 'all') {
        events = events.filter(e => e.trainer === trainerValue);
    }
    const typeValue = document.getElementById('scheduleTypeFilter')?.value || 'all';
    if (typeValue !== 'all') {
        events = events.filter(e => e.name === typeValue);
    }

    events = events.filter(e => {
        const eventDate = new Date(e.start).toISOString().split('T')[0];
        return eventDate === _scheduleCurrentDate;
    });

    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    if (events.length === 0) {
        container.innerHTML = '<p class="text-center">На выбранный день нет тренировок</p>';
        return;
    }

    const cart = getCart();

    container.innerHTML = events.map(e => {
        const startDate = new Date(e.start);
        const endDate = new Date(e.end);
        const formattedStart = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const formattedEnd = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const timeRange = `${formattedStart} - ${formattedEnd}`;
        const available = e.max - e.booked;
        const priceDisplay = e.price ? `${e.price} ₽` : 'Цена не указана';

        const price = e.price ? `${e.price} ₽` : 'Цена не указана';
        const isBooked = _userBookedSessions.includes(Number(e.id));
        const isInCart = cart.some(item => (item.type === 'session' || item.type === 'training') && item.sessionId === e.id);

        let buttonHtml;
        if (isBooked) {
            buttonHtml = '<button class="btn btn-success" disabled>Вы записаны</button>';
        } else if (isInCart) {
            buttonHtml = `
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary" disabled>Выбрано</button>
                    <button class="btn btn-danger" onclick="removeTrainingFromCart(${e.id})">Убрать</button>
                </div>
            `;
        } else {
            buttonHtml = `<button class="btn" onclick="bookSession(${e.id}, '${e.name}', '${e.trainer}', '${e.start}')">Записаться</button>`;
        }

        return `
            <div class="card">
                <div class="card-body">
                    <h3 class="card-title">${e.name}</h3>
                    <p><strong>Тренер:</strong> ${e.trainer}</p>
                    <p><strong>Время:</strong> ${timeRange}</p>
                    <p><strong>Зал:</strong> ${e.room}</p>
                    <p>Свободно: ${available} / ${e.max}</p>
                    <p><strong>Цена:</strong> ${price}</p>
                </div>
                <div class="card-footer">
                    ${buttonHtml}
                </div>
            </div>
        `;
    }).join('');
}

window.removeTrainingFromCart = function(sessionId) {
    const cart = getCart();
    const newCart = cart.filter(item => !((item.type === 'session' || item.type === 'training') && item.sessionId === sessionId));
    saveCart(newCart);
    applyScheduleFiltersAndRender();
};

window.prevScheduleDay = function() {
    const date = new Date(_scheduleCurrentDate);
    date.setDate(date.getDate() - 1);
    _scheduleCurrentDate = date.toISOString().split('T')[0];
    document.getElementById('scheduleCurrentDate').innerText = date.toLocaleDateString('ru-RU');
    applyScheduleFiltersAndRender();
};

window.nextScheduleDay = function() {
    const date = new Date(_scheduleCurrentDate);
    date.setDate(date.getDate() + 1);
    _scheduleCurrentDate = date.toISOString().split('T')[0];
    document.getElementById('scheduleCurrentDate').innerText = date.toLocaleDateString('ru-RU');
    applyScheduleFiltersAndRender();
};

async function initSchedulePage() {
    const today = new Date();
    _scheduleCurrentDate = today.toISOString().split('T')[0];
    const display = document.getElementById('scheduleCurrentDate');
    if (display) display.innerText = today.toLocaleDateString('ru-RU');

    _allScheduleEvents = await fetchSchedule();
    await loadUserBookings();
    await loadScheduleFilters();
    applyScheduleFiltersAndRender();

    const trainerFilter = document.getElementById('scheduleTrainerFilter');
    const typeFilter = document.getElementById('scheduleTypeFilter');
    const applyFilters = () => applyScheduleFiltersAndRender();
    if (trainerFilter) trainerFilter.addEventListener('change', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
}

window.bookSession = async function(sessionId, name, trainer, start) {
    if (!requireAuth()) return;
    const user = getCurrentUser();
    if (user.role !== 'Клиент') {
        alert('Только клиенты могут записываться на тренировки');
        return;
    }
    const schedule = await fetchSchedule();
    const session = schedule.find(s => s.id === sessionId);
    if (!session) return;
    if (session.booked >= session.max) {
        alert('Нет свободных мест');
        return;
    }
    const startDate = new Date(start);
    const endDate = new Date(session.end);
    const formattedDate = startDate.toLocaleDateString('ru-RU');
    const formattedStart = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const formattedEnd = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const timeRange = `${formattedStart} - ${formattedEnd}`;

    const hasActive = await checkActiveSubscription(user.id);
    let price = session.price || 500;
    if (hasActive) price = 0;

    // Получаем фото тренера по имени
    let trainerPhoto = '';
    try {
        const trainers = await fetchTrainers();
        const foundTrainer = trainers.find(t => t.name === session.trainer);
        if (foundTrainer && foundTrainer.photo) trainerPhoto = foundTrainer.photo;
    } catch(e) { console.error(e); }

    addToCart({
        id: `session_${sessionId}_${Date.now()}`,
        name: session.name,
        price: price,
        time: `${formattedDate} ${timeRange}`,
        timeRange: timeRange,
        date: formattedDate,
        trainer: session.trainer,
        type: 'session',
        sessionId: sessionId,
        uniqueId: `session_${sessionId}`,
        startTime: start,
        endTime: session.end,
        image: trainerPhoto || 'https://via.placeholder.com/80?text=Group+Training'
    });
    applyScheduleFiltersAndRender();
};

// Глобальный обработчик для кнопок "В корзину" на товарах
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart')) {
        const btn = e.target;
        const product = {
            id: parseInt(btn.dataset.id),
            name: btn.dataset.name,
            price: parseFloat(btn.dataset.price),
            image: btn.dataset.image,
            unit: btn.dataset.unit,
            stock: parseInt(btn.dataset.stock),
            type: 'product'
        };
        addToCart(product);
        if (document.getElementById('productsGrid')) loadProducts();
        if (document.getElementById('productsPreview')) loadProductsPreview();
    }
});

// Загрузка публичных настроек и обновление элементов на странице
async function loadPublicSettings() {
    try {
        const res = await fetch(`${API_URL}/public-settings`);
        if (!res.ok) return;
        const settings = await res.json();
        
        // Обновляем информацию о часах работы персонала на главной странице
        const supportHoursElem = document.getElementById('supportWorkHours');
        if (supportHoursElem && settings.support_work_hours) {
            supportHoursElem.innerText = settings.support_work_hours;
        }
        
        // Обновляем контакты в подвале (если они есть)
        const footerPhone = document.getElementById('footerPhone');
        if (footerPhone && settings.contact_phone) {
            footerPhone.innerText = settings.contact_phone;
        }
        const footerEmail = document.getElementById('footerEmail');
        if (footerEmail && settings.contact_email) {
            footerEmail.innerText = settings.contact_email;
        }
        const footerAddress = document.getElementById('footerAddress');
        if (footerAddress && settings.contact_address) {
            footerAddress.innerText = settings.contact_address;
        }
        
        // Часы работы клуба (можно добавить на страницу)
        const clubHoursElem = document.getElementById('clubWorkHours');
        if (clubHoursElem && settings.club_work_hours) {
            clubHoursElem.innerText = settings.club_work_hours;
        }
    } catch (err) {
        console.error('Ошибка загрузки публичных настроек:', err);
    }
}


window.loadUserBookings = loadUserBookings;
window.applyScheduleFiltersAndRender = applyScheduleFiltersAndRender;

document.addEventListener('DOMContentLoaded', function() {
    loadPublicSettings();
    updateHeader();

    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) mobileBtn.addEventListener('click', toggleMobileMenu);

    document.addEventListener('click', function(e) {
        const navMenu = document.querySelector('nav ul');
        const mobileBtn = document.getElementById('mobileMenuBtn');
        if (navMenu && navMenu.classList.contains('active') && !navMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    // Страница услуг
    const serviceAccessFilter = document.getElementById('serviceAccessFilter');
    const serviceDurationFilter = document.getElementById('serviceDurationFilter');
    const serviceSortFilter = document.getElementById('serviceSortFilter');
    if (serviceAccessFilter && serviceDurationFilter && serviceSortFilter) {
        loadServiceFilters().then(() => {
            loadServices({
                access: serviceAccessFilter.value,
                duration: serviceDurationFilter.value,
                sort: serviceSortFilter.value
            });
        });
        const applyServiceFilters = () => {
            loadServices({
                access: serviceAccessFilter.value,
                duration: serviceDurationFilter.value,
                sort: serviceSortFilter.value
            });
        };
        serviceAccessFilter.addEventListener('change', applyServiceFilters);
        serviceDurationFilter.addEventListener('change', applyServiceFilters);
        serviceSortFilter.addEventListener('change', applyServiceFilters);
    }

    // Страница товаров
    const productCategoryFilter = document.getElementById('productCategoryFilter');
    const productSortFilter = document.getElementById('productSortFilter');
    if (productCategoryFilter && productSortFilter) {
        loadCategoryFilter().then(() => {
            loadProducts({ category: productCategoryFilter.value, sort: productSortFilter.value });
        });
        const applyProductFilters = () => {
            loadProducts({ category: productCategoryFilter.value, sort: productSortFilter.value });
        };
        productCategoryFilter.addEventListener('change', applyProductFilters);
        productSortFilter.addEventListener('change', applyProductFilters);
    }

    // Страница тренеров
    const trainerSpecializationFilter = document.getElementById('trainerSpecializationFilter');
    const trainerSortFilter = document.getElementById('trainerSortFilter');
    if (trainerSpecializationFilter && trainerSortFilter) {
        loadSpecializationsFilter().then(() => {
            loadTrainers({ specialization: trainerSpecializationFilter.value, sort: trainerSortFilter.value });
        });
        const applyTrainerFilters = () => {
            loadTrainers({ specialization: trainerSpecializationFilter.value, sort: trainerSortFilter.value });
        };
        trainerSpecializationFilter.addEventListener('change', applyTrainerFilters);
        trainerSortFilter.addEventListener('change', applyTrainerFilters);
    }

    // Страница расписания
    if (document.getElementById('scheduleGrid')) {
        initSchedulePage();
    }
});