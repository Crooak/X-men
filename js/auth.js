// js/auth.js
const API_URL = 'http://localhost:3000/api';

let currentUser = null;

function getCurrentUser() {
    if (!currentUser) {
        const userJson = localStorage.getItem('currentUser');
        currentUser = userJson ? JSON.parse(userJson) : null;
    }
    return currentUser;
}

function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    migrateCartForUser(user.id);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.error || 'Ошибка входа');
            return false;
        }
        setCurrentUser(data);
        return true;
    } catch (err) {
        console.error('Ошибка соединения с сервером:', err);
        alert('Ошибка соединения с сервером');
        return false;
    }
}
function getCartKey() {
    const user = getCurrentUser();
    return user ? `cart_${user.id}` : 'cart_guest';
}

function getCart() {
    const key = getCartKey();
    const cart = localStorage.getItem(key);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    const key = getCartKey();
    localStorage.setItem(key, JSON.stringify(cart));
    if (typeof updateHeader === 'function') updateHeader();
}

function migrateCartForUser(userId) {
    const guestCart = localStorage.getItem('cart_guest');
    if (guestCart) {
        const userCart = localStorage.getItem(`cart_${userId}`);
        if (!userCart) {
            localStorage.setItem(`cart_${userId}`, guestCart);
        }
        localStorage.removeItem('cart_guest');
    }
}

async function addToCart(item) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const cart = getCart();

    if (item.type === 'subscription') {
        const hasActive = await checkActiveSubscription(user.id);
        if (hasActive) {
            alert('У вас уже есть активный абонемент. Нельзя добавить ещё один.');
            return;
        }
        if (cart.some(i => i.type === 'subscription')) {
            alert('Абонемент уже в корзине. Можно иметь только один абонемент.');
            return;
        }
        cart.push({ ...item, quantity: 1 });
        saveCart(cart);
        return;
    }

    if (item.type === 'product') {
        const existing = cart.find(i => i.id === item.id && i.type === 'product');
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        saveCart(cart);
        return;
    }

    if (item.type === 'training' || item.type === 'session') {
        const duplicate = cart.some(i => i.sessionId === item.sessionId);
        if (duplicate) {
            alert('Эта тренировка уже в корзине.');
            return;
        }
        const userTrainings = await fetchClientTrainings(user.id);
        const alreadyBooked = userTrainings.some(t => t.session_id === item.sessionId && t.status === 'подтверждено');
        if (alreadyBooked) {
            alert('Вы уже записаны на эту тренировку.');
            return;
        }
        cart.push({ ...item, quantity: 1 });
        saveCart(cart);
        return;
    }

    console.warn('Неизвестный тип товара:', item.type);
}

function removeFromCart(itemId) {
    let cart = getCart();
    cart = cart.filter(item => item.id != itemId);
    saveCart(cart);
}

function clearCart() {
    saveCart([]);
}

function getCartTotalCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotalSum() {
    return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function isProductInCart(productId) {
    return getCart().some(item => item.type === 'product' && item.id === productId);
}
function getProductQuantity(productId) {
    const item = getCart().find(item => item.type === 'product' && item.id === productId);
    return item ? item.quantity : 0;
}
function isSubscriptionInCart() {
    return getCart().some(item => item.type === 'subscription');
}
function isTrainingInCart(sessionId) {
    return getCart().some(item => (item.type === 'training' || item.type === 'session') && item.sessionId === sessionId);
}

async function fetchSubscriptions() {
    const res = await fetch(`${API_URL}/subscriptions`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchProducts() {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchTrainers() {
    const res = await fetch(`${API_URL}/trainers`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchTrainerById(id) {
    const res = await fetch(`${API_URL}/trainers/${id}`);
    if (!res.ok) return null;
    return await res.json();
}
async function fetchSchedule() {
    const res = await fetch(`${API_URL}/schedule`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchClientVisits(clientId) {
    const res = await fetch(`${API_URL}/client/${clientId}/visits`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchClientTrainings(clientId) {
    const res = await fetch(`${API_URL}/client/${clientId}/trainings`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchClientOrders(clientId) {
    const res = await fetch(`${API_URL}/client/${clientId}/orders`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchTrainerSchedule(trainerId) {
    const res = await fetch(`${API_URL}/trainer/${trainerId}/schedule`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchTrainerClients(trainerId) {
    const res = await fetch(`${API_URL}/trainer/${trainerId}/clients`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchAllClients() {
    const res = await fetch(`${API_URL}/manager/clients`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchAllTrainings() {
    const res = await fetch(`${API_URL}/manager/trainings`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchAllUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchSystemSettings() {
    const res = await fetch(`${API_URL}/admin/settings`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchSystemLogs() {
    const res = await fetch(`${API_URL}/admin/logs`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchAvailableSlots(trainerId) {
    const res = await fetch(`${API_URL}/trainer/${trainerId}/available-slots`);
    if (!res.ok) return [];
    return await res.json();
}
async function checkActiveSubscription(clientId) {
    const res = await fetch(`${API_URL}/client/${clientId}/active-subscription`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.hasActive;
}
async function fetchProductCategories() {
    const res = await fetch(`${API_URL}/product-categories`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchSubscriptionAccessTypes() {
    const res = await fetch(`${API_URL}/subscription-access-types`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchSubscriptionDurations() {
    const res = await fetch(`${API_URL}/subscription-durations`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchTrainersList() {
    const res = await fetch(`${API_URL}/trainers/all`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchGroupTrainingNames() {
    const res = await fetch(`${API_URL}/group-training-names`);
    if (!res.ok) return [];
    return await res.json();
}
async function fetchAllSpecializations() {
    const res = await fetch(`${API_URL}/specializations`);
    if (!res.ok) return [];
    return await res.json();
}

async function register(full_name, email, phone, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, phone, password })
        });
        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || 'Ошибка регистрации' };
        }
        return { success: true, id: data.id };
    } catch (err) {
        console.error('Ошибка при регистрации:', err);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

async function updateUserData(userId, data) {
    try {
        const response = await fetch(`${API_URL}/user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            return { success: false, error: result.error };
        }
        return { success: true, user: result };
    } catch (err) {
        console.error('Ошибка при обновлении данных:', err);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

async function fetchMyTrainers(clientId) {
    const res = await fetch(`${API_URL}/client/${clientId}/my-trainers`);
    if (!res.ok) return [];
    return await res.json();
}

async function fetchClientAllOrders(clientId) {
    const res = await fetch(`${API_URL}/client/${clientId}/all-orders`);
    if (!res.ok) return [];
    return await res.json();
}
