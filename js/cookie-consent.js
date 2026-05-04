(function() {
    function setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#2c3e50;color:white;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 -2px 10px rgba(0,0,0,0.2);z-index:10000;font-family:inherit';
        banner.innerHTML = `
            <div style="flex:1;margin-right:20px">
                <p style="margin:0;font-size:14px">Мы используем файлы cookie для авторизации, аналитики и улучшения работы сайта. 
                <a href="#" style="color:#3498db;text-decoration:underline" onclick="event.preventDefault();alert('Политика конфиденциальности')">Подробнее</a></p>
            </div>
            <div>
                <button id="accept-cookies" style="background:#3498db;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-right:5px;font-size:14px">Принять</button>
                <button id="decline-cookies" style="background:transparent;color:white;border:1px solid white;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px">Отклонить</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('accept-cookies').addEventListener('click', function() {
            setCookie('cookie_consent', 'accepted', 365);
            banner.remove();
        });

        document.getElementById('decline-cookies').addEventListener('click', function() {
            setCookie('cookie_consent', 'declined', 365);
            banner.remove();
        });
    }

    // Показываем баннер, только если согласие ещё не дано
    if (!getCookie('cookie_consent')) {
        // Ждём загрузки DOM, чтобы не мешать
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            createBanner();
        } else {
            document.addEventListener('DOMContentLoaded', createBanner);
        }
    }
})();