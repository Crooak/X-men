// js/cart.js

document.addEventListener('DOMContentLoaded', function() {
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
        const quantityControls = isProduct
            ? `<div class="cart-item-quantity">
                <button class="btn btn-sm" onclick="decrementCartItem('${item.id}')">-</button>
                <span>${item.quantity}</span>
                <button class="btn btn-sm" onclick="incrementCartItem('${item.id}')">+</button>
           </div>`
        : `<div class="cart-item-quantity"><span>1</span></div>`;

         let timeDisplay = '';
    if (item.timeRange) {
        timeDisplay = `<div class="cart-item-time">${item.date} ${item.timeRange}</div>`;
    } else if (item.time) {
        timeDisplay = `<div class="cart-item-time">${item.time}</div>`;
    }

        return `
        <div class="cart-item">
            <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${item.price} ₽</div>
                ${timeDisplay}
                ${item.trainer ? `<div>Тренер: ${item.trainer}</div>` : ''}
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

    const subscriptionItem = cart.find(item => item.type === 'subscription');
    if (subscriptionItem) {
        const hasActive = await checkActiveSubscription(user.id);
        if (hasActive) {
            alert('У вас уже есть активный абонемент. Оформите заказ без абонемента.');
            return;
        }
    }

    if (subscriptionItem) {
        const res = await fetch(`${API_URL}/subscriptions/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: user.id, tier_id: subscriptionItem.id })
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Ошибка покупки абонемента: ' + err.error);
            return;
        }
        cart = cart.filter(item => item.type !== 'subscription');
        saveCart(cart);
    }

    const products = cart.filter(item => item.type === 'product').map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
    }));

    if (products.length > 0) {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: user.id, items: products })
        });
        if (!res.ok) {
            alert('Ошибка при оформлении заказа товаров');
            return;
        }
    }

    const bookings = cart.filter(item => item.type === 'training' || item.type === 'session');
    for (const booking of bookings) {
        const sessionId = booking.sessionId;
        if (!sessionId) {
            alert('Ошибка: отсутствует идентификатор тренировки');
            return;
        }

        const bookRes = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: user.id,
                session_id: sessionId,
                source: 'корзина'
            })
        });
        if (!bookRes.ok) {
            const err = await bookRes.json();
            alert('Ошибка записи на тренировку: ' + (err.error || 'неизвестная ошибка'));
            return;
        }
    }

    alert('Заказ оформлен!');
    clearCart();
    // Обновляем страницу расписания, если она открыта
    if (typeof window.applyScheduleFiltersAndRender === 'function') {
        window.applyScheduleFiltersAndRender();
    }
    renderCart();
    updateHeader();
};