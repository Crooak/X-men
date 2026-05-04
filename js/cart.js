// js/cart.js

document.addEventListener('DOMContentLoaded', async function() {
    await initAuth();
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    const container = document.getElementById('cartContainer');
    if (container) {
        renderCart();
    }
});

async function renderCart() {
    const container = document.getElementById('cartContainer');
    if (!container) return;

    const cart = getCart();
    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart"><p>Корзина пуста</p><a href="products.html" class="btn">Перейти к товарам</a></div>`;
        return;
    }

    const itemsHtml = cart.map(item => {
        const isProduct = item.type === 'product';
        const safeName = escapeHtml(item.name);
        const safeImage = escapeHtml(item.image || 'https://via.placeholder.com/80');
        const safeTrainer = escapeHtml(item.trainer || '');
        const safeTime = escapeHtml(item.timeRange || item.time || '');
        const safeDate = escapeHtml(item.date || '');

        const quantityControls = isProduct
            ? `<div class="cart-item-quantity">
                <button class="btn btn-sm" onclick="decrementCartItem('${item.id}')">-</button>
                <span>${item.quantity}</span>
                <button class="btn btn-sm" onclick="incrementCartItem('${item.id}')">+</button>
           </div>`
        : `<div class="cart-item-quantity"><span>1</span></div>`;

        let timeDisplay = '';
        if (item.timeRange) {
            timeDisplay = `<div class="cart-item-time">${safeDate} ${safeTime}</div>`;
        } else if (item.time) {
            timeDisplay = `<div class="cart-item-time">${safeTime}</div>`;
        }

        return `
        <div class="cart-item">
            <img src="${safeImage}" alt="${safeName}">
            <div class="cart-item-details">
                <div class="cart-item-title">${safeName}</div>
                <div class="cart-item-price">${item.price} ₽</div>
                ${timeDisplay}
                ${safeTrainer ? `<div>Тренер: ${safeTrainer}</div>` : ''}
            </div>
            ${quantityControls}
            <div class="cart-item-remove" onclick="removeCartItem('${item.id}')">🗑</div>
        </div>
    `;
    }).join('');

    const total = getCartTotalSum();

    container.innerHTML = `
        <div class="cart-items">${itemsHtml}</div>
        <div class="cart-summary">
            <h3>Итого</h3>
            <div class="summary-row"><span>Товары (${getCartTotalCount()} шт.)</span><span>${total} ₽</span></div>
            <div class="summary-row total-row"><span>К оплате</span><span>${total} ₽</span></div>
            <button class="btn btn-block" onclick="checkout()">Оформить заказ</button>
            <button class="btn btn-block btn-outline" onclick="clearCartAndRefresh()">Очистить корзину</button>
        </div>
    `;
}

window.incrementCartItem = function(itemId) {
    const cart = getCart();
    const item = cart.find(i => i.id == itemId);
    if (!item) return;
    if (item.type === 'product') {
        item.quantity++;
    } else {
        alert('Нельзя изменить количество для этого типа товара');
        return;
    }
    saveCart(cart);
    renderCart();
    updateHeader();
};

window.decrementCartItem = function(itemId) {
    const cart = getCart();
    const item = cart.find(i => i.id == itemId);
    if (!item) return;
    if (item.type === 'product') {
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            removeCartItem(itemId);
            return;
        }
    } else {
        alert('Нельзя изменить количество для этого типа товара');
        return;
    }
    saveCart(cart);
    renderCart();
    updateHeader();
};

window.removeCartItem = function(itemId) {
    removeFromCart(itemId);
    renderCart();
};

window.clearCartAndRefresh = function() {
    clearCart();
    renderCart();
};

window.checkout = async function() {
    const user = getCurrentUser();
    if (!user) return;
    let cart = getCart();
    if (cart.length === 0) return alert('Корзина пуста');

    // Подготовка данных для отправки
    const items = cart.map(item => {
        const base = {
            id: item.id,
            name: escapeHtml(item.name), // экранируем для передачи в JSON
            price: item.price,
            type: item.type,
            quantity: item.quantity || 1
        };
        if (item.type === 'subscription') {
            return { ...base, id: item.id };
        }
        if (item.type === 'product') {
            return { ...base, id: item.id, quantity: item.quantity };
        }
        if (item.type === 'training' || item.type === 'session') {
            return { ...base, sessionId: item.sessionId, name: escapeHtml(item.name) };
        }
        return base;
    });

    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: user.id, items }),
            credentials: 'include'
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Ошибка оформления');
        }
        alert('Заказ оформлен!');
        clearCart();
        // Обновляем расписание, если открыто
        if (typeof window.applyScheduleFiltersAndRender === 'function') {
            window.applyScheduleFiltersAndRender();
        }
        renderCart();
        updateHeader();
    } catch (e) {
        alert(e.message);
    }
};