// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'A',
    password: '15357595',
    port: 5432,
});

async function checkSlotOverlap(trainerId, start, end, excludeSessionId = null) {
    let query = `SELECT id FROM training_sessions 
                 WHERE trainer_id = $1 
                   AND tstzrange(start_time, end_time) && tstzrange($2, $3)`;
    const params = [trainerId, start, end];
    if (excludeSessionId) {
        query += ` AND id != $4`;
        params.push(excludeSessionId);
    }
    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

app.use(cors());
app.use(express.json());

// ========== Вспомогательная функция ==========
async function checkActiveSubscription(clientId) {
    const res = await pool.query(
        `SELECT id FROM client_subscriptions 
         WHERE client_id = $1 AND status = 'активен' AND end_date > NOW()`,
        [clientId]
    );
    return res.rows.length > 0;
}

// ========== Публичные эндпоинты ==========
app.get('/api/subscriptions', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, description, duration_dayss as duration, price, access_type as access, is_active FROM subscription_tiers WHERE is_active = true'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, description, price, unit, stock_quantity as stock, image_url as image, category, is_active FROM products WHERE is_active = true'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/product-categories', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category`
        );
        res.json(result.rows.map(r => r.category));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение уникальных типов доступа абонементов
app.get('/api/subscription-access-types', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT access_type FROM subscription_tiers WHERE access_type IS NOT NULL ORDER BY access_type'
        );
        res.json(result.rows.map(r => r.access_type));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение уникальных сроков действия абонементов
app.get('/api/subscription-durations', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT duration_dayss FROM subscription_tiers WHERE duration_dayss IS NOT NULL ORDER BY duration_dayss'
        );
        res.json(result.rows.map(r => r.duration_dayss));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/trainers', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.id, u.full_name as name, 
                    (SELECT string_agg(s.name, ', ') 
                     FROM trainer_specializations ts 
                     JOIN specializations s ON ts.specialization_id = s.id 
                     WHERE ts.trainer_id = t.id) as specialization,
                    t.rating, t.bio, u.photo_url as photo, t.hourly_rate
             FROM trainers t
             JOIN "Users" u ON t.id = u.id
             WHERE t.is_available = true AND u.role_id = 2`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/trainers/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(
            `SELECT t.id, u.full_name as name, t.specialization, t.rating, t.bio, u.photo_url as photo
             FROM trainers t
             JOIN "Users" u ON t.id = u.id
             WHERE t.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Trainer not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/trainers/all', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.id, u.full_name as name
             FROM trainers t
             JOIN "Users" u ON t.id = u.id
             WHERE t.is_available = true AND u.role_id = 2`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/schedule', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ts.id, ts.type, ts.name, u.full_name as trainer, 
                    ts.start_time as start, ts.end_time as end,
                    ts.max_participants as max, ts.room, ts.price,
                    (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked
             FROM training_sessions ts
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             WHERE ts.status = 'запланировано' AND ts.type = 'групповая'`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// Эндпоинт для обновления описания тренера (bio)
app.put('/api/trainer/:id/bio', async (req, res) => {
    const { id } = req.params;
    const { bio } = req.body;
    try {
        await pool.query('UPDATE trainers SET bio = $1 WHERE id = $2', [bio, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// ========== Регистрация ==========
app.post('/api/register', async (req, res) => {
    const { full_name, email, phone, password, role_id = 3 } = req.body; // по умолчанию клиент
    try {
        // Проверка уникальности email
        const emailCheck = await pool.query('SELECT id FROM "Users" WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        // Проверка уникальности телефона
        const phoneCheck = await pool.query('SELECT id FROM "Users" WHERE phone = $1', [phone]);
        if (phoneCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
        }

        await pool.query('BEGIN');
        
        // Получаем следующий ID из последовательности users_id_seq
        const seqRes = await pool.query(`SELECT nextval('users_id_seq') as next_id`);
        const nextId = seqRes.rows[0].next_id;

        // Сначала вставляем запись в trainers (чтобы внешний ключ не ругался)
        await pool.query(
            `INSERT INTO trainers (id, specialization, bio, certificates, rating, is_available)
             VALUES ($1, NULL, NULL, NULL, NULL, $2)`,
            [nextId, role_id === 2] // для тренера is_available=true
        );

        // Теперь вставляем пользователя
        await pool.query(
            `INSERT INTO "Users" (id, full_name, email, phone, password_hash, role_id, photo_url, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NULL, true, NOW())`,
            [nextId, full_name, email, phone, password, role_id]
        );

        await pool.query('COMMIT');
        res.json({ success: true, id: nextId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Ошибка при регистрации:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Авторизация ==========
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Поиск по email
        let result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.role_id, r.name as role_name, u.photo_url
             FROM "Users" u
             JOIN roles r ON u.role_id = r.id
             WHERE u.email = $1 AND u.is_active = true`,
            [email]
        );

        // Если не найден по email, пробуем по телефону
        if (result.rows.length === 0) {
            const phoneDigits = email.replace(/\D/g, '');
            if (phoneDigits.length >= 10) {
                const lastTen = phoneDigits.slice(-10);
                result = await pool.query(
                    `SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.role_id, r.name as role_name, u.photo_url
                     FROM "Users" u
                     JOIN roles r ON u.role_id = r.id
                     WHERE right(regexp_replace(u.phone, '\D', '', 'g'), 10) = $1 AND u.is_active = true`,
                    [lastTen]
                );
            }
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
        }

        const user = result.rows[0];

        // Проверка пароля
        if (password !== user.password_hash) {
            return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
        }

        let specialization = null;
        let rating = null;
        let bio = null;
        let hourly_rate = null;

        if (user.role_id === 2) {
            const trainerRes = await pool.query(
                'SELECT specialization, rating, bio, hourly_rate FROM trainers WHERE id = $1',
                [user.id]
            );
            if (trainerRes.rows.length > 0) {
                specialization = trainerRes.rows[0].specialization;
                rating = trainerRes.rows[0].rating;
                bio = trainerRes.rows[0].bio;
                hourly_rate = trainerRes.rows[0].hourly_rate;
            }
        }

        res.json({
            id: user.id,
            name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role_name,
            photo: user.photo_url,
            specialization,
            rating,
            bio,
            hourly_rate
        });
    } catch (err) {
        console.error('Ошибка при логине:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Клиентские данные ==========
app.get('/api/client/:id/active-subscription', async (req, res) => {
    const clientId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT cs.id, cs.end_date, st.name as subscription_name
             FROM client_subscriptions cs
             JOIN subscription_tiers st ON cs.tier_id = st.id
             WHERE cs.client_id = $1 AND cs.status = 'активен' AND cs.end_date > NOW()`,
            [clientId]
        );
        if (result.rows.length > 0) {
            const { end_date, subscription_name } = result.rows[0];
            res.json({ hasActive: true, end_date, name: subscription_name });
        } else {
            res.json({ hasActive: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Все заказы клиента (товары + абонементы) ==========
app.get('/api/client/:id/all-orders', async (req, res) => {
    const clientId = req.params.id;
    try {
        // Заказы товаров
        const productOrders = await pool.query(
            `SELECT o.id, p.name, o.total_price as total, o.status, o.created_at as date,
                    'товар' as type
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.client_id = $1`,
            [clientId]
        );

        // Абонементы
        const subscriptions = await pool.query(
            `SELECT cs.id, st.name, cs.price_paid as total, cs.status, cs.created_at as date,
                    'абонемент' as type
             FROM client_subscriptions cs
             JOIN subscription_tiers st ON cs.tier_id = st.id
             WHERE cs.client_id = $1`,
            [clientId]
        );

        // Объединяем и сортируем по дате (новые сверху)
        const allOrders = [...productOrders.rows, ...subscriptions.rows].sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(allOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/client/:id/visits', async (req, res) => {
    const clientId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT id, to_char(entry_time, 'YYYY-MM-DD HH24:MI') as date, method, success
             FROM access_logs
             WHERE client_id = $1
             ORDER BY entry_time DESC`,
            [clientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


app.get('/api/client/:id/orders', async (req, res) => {
    const clientId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT o.id, p.name as product, o.quantity, o.total_price as total, o.status, 
                    to_char(o.created_at, 'YYYY-MM-DD') as date
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.client_id = $1
             ORDER BY o.created_at DESC`,
            [clientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Тренерские данные ==========

app.get('/api/trainer/:id/schedule', async (req, res) => {
    const trainerId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT ts.id, ts.name, to_char(ts.start_time, 'YYYY-MM-DD HH24:MI') as date, 
                    u.full_name as client, b.status, ts.type,
                    (SELECT COUNT(*) FROM bookings b2 WHERE b2.session_id = ts.id AND b2.status = 'подтверждено') as booked
             FROM training_sessions ts
             LEFT JOIN bookings b ON ts.id = b.session_id AND b.status = 'подтверждено'
             LEFT JOIN "Users" u ON b.client_id = u.id
             WHERE ts.trainer_id = $1 AND ts.status = 'запланировано'
               AND (b.id IS NOT NULL OR ts.type = 'групповая')
             ORDER BY ts.start_time`,
            [trainerId]
        );
        // Убираем дубликаты (если на групповую несколько клиентов)
        const sessionsMap = new Map();
        result.rows.forEach(row => {
            if (!sessionsMap.has(row.id)) {
                sessionsMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    date: row.date,
                    status: row.status,
                    type: row.type,
                    booked: row.booked,
                    client: row.client || (row.type === 'групповая' ? `Групповая (${row.booked} чел.)` : null)
                });
            }
        });
        res.json(Array.from(sessionsMap.values()));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/trainer/:id/clients', async (req, res) => {
    const trainerId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT DISTINCT u.id, u.full_name as name, u.phone, 
                    (SELECT COUNT(*) FROM bookings b WHERE b.client_id = u.id AND b.session_id IN 
                        (SELECT id FROM training_sessions WHERE trainer_id = $1)) as trainings
             FROM bookings b
             JOIN "Users" u ON b.client_id = u.id
             WHERE b.session_id IN (SELECT id FROM training_sessions WHERE trainer_id = $1)
             ORDER BY u.full_name`,
            [trainerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Менеджер / Админ ==========
app.get('/api/manager/clients', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name as name, u.phone, u.email, 
                    COALESCE(st.name, 'Нет') as subscription, cs.status
             FROM "Users" u
             LEFT JOIN client_subscriptions cs ON u.id = cs.client_id AND cs.status = 'активен'
             LEFT JOIN subscription_tiers st ON cs.tier_id = st.id
             WHERE u.role_id = 3
             ORDER BY u.full_name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/manager/trainings', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ts.id, ts.name, u.full_name as trainer, 
                    to_char(ts.start_time, 'YYYY-MM-DD HH24:MI') as date,
                    ts.room, ts.max_participants as max,
                    (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked
             FROM training_sessions ts
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             ORDER BY ts.start_time`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name as name, u.email, u.phone, r.name as role, u.is_active
             FROM "Users" u
             JOIN roles r ON u.role_id = r.id
             ORDER BY u.id`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/settings', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT key, value, description, updated_at FROM system_settings ORDER BY key`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT al.id, u.email as user, al.action, to_char(al.created_at, 'YYYY-MM-DD HH24:MI:SS') as time, al.ip_address as ip
             FROM audit_log al
             JOIN "Users" u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT 100`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Обновление данных пользователя ==========
app.put('/api/user/:id', async (req, res) => {
    const userId = req.params.id;
    const { full_name, email, phone, currentPassword, newPassword } = req.body;

    try {
        // Получаем текущие данные пользователя
        const userRes = await pool.query('SELECT password_hash FROM "Users" WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        const currentHash = userRes.rows[0].password_hash;

        // Если меняется пароль, проверяем текущий
        if (newPassword) {
            if (currentPassword !== currentHash) {
                return res.status(400).json({ error: 'Неверный текущий пароль' });
            }
            // Здесь можно добавить проверку сложности нового пароля
        }

        // Проверка уникальности email (если меняется)
        if (email) {
            const emailCheck = await pool.query('SELECT id FROM "Users" WHERE email = $1 AND id != $2', [email, userId]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
        }

        // Проверка уникальности телефона (если меняется)
        if (phone) {
            const phoneCheck = await pool.query('SELECT id FROM "Users" WHERE phone = $1 AND id != $2', [phone, userId]);
            if (phoneCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
            }
        }

        // Формируем запрос на обновление
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (full_name) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        if (email) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (phone) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }
        if (newPassword) {
            updates.push(`password_hash = $${paramIndex++}`);
            values.push(newPassword); // в реальном проекте нужно хешировать
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        values.push(userId);
        const query = `UPDATE "Users" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, full_name, email, phone`;

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка при обновлении пользователя:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Мои тренеры (для клиента) ==========
app.get('/api/client/:clientId/my-trainers', async (req, res) => {
    const clientId = req.params.clientId;
    try {
        const result = await pool.query(
            `SELECT 
                t.id AS trainer_id,
                u.full_name AS trainer_name,
                (SELECT string_agg(s.name, ', ') 
                 FROM trainer_specializations ts 
                 JOIN specializations s ON ts.specialization_id = s.id 
                 WHERE ts.trainer_id = t.id) AS specialization,
                COUNT(b.id) AS past_trainings,
                (SELECT rating FROM client_trainer_ratings WHERE client_id = $1 AND trainer_id = t.id) AS my_rating
             FROM bookings b
             JOIN training_sessions ts ON b.session_id = ts.id
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             WHERE b.client_id = $1
               AND b.status = 'подтверждено'
               AND ts.end_time < NOW()
             GROUP BY t.id, u.full_name
             ORDER BY u.full_name`,
            [clientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Сохранение оценки тренера ==========
app.post('/api/ratings', async (req, res) => {
    const { client_id, trainer_id, rating } = req.body;
    try {
        await pool.query('BEGIN');
        // вставка или обновление
        await pool.query(
            `INSERT INTO client_trainer_ratings (client_id, trainer_id, rating, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (client_id, trainer_id) 
             DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
            [client_id, trainer_id, rating]
        );
        // пересчёт среднего рейтинга тренера
        const avgRes = await pool.query(
            `SELECT AVG(rating)::numeric(10,2) as avg_rating
             FROM client_trainer_ratings
             WHERE trainer_id = $1`,
            [trainer_id]
        );
        const avgRating = avgRes.rows[0].avg_rating;
        await pool.query(
            `UPDATE trainers SET rating = $1 WHERE id = $2`,
            [avgRating, trainer_id]
        );
        await pool.query('COMMIT');
        res.json({ success: true, new_avg: avgRating });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});



// ========== Управление пользователями ==========
app.post('/api/admin/users', async (req, res) => {
    const { full_name, email, phone, password, role_id, photo_url } = req.body;
    try {
        await pool.query('BEGIN');
        const userRes = await pool.query(
            `INSERT INTO "Users" (full_name, email, phone, password_hash, role_id, photo_url, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING id`,
            [full_name, email, phone, password, role_id, photo_url]
        );
        const userId = userRes.rows[0].id;
        // Добавляем запись в trainers для любого пользователя (из-за ограничения внешнего ключа)
        await pool.query(
            `INSERT INTO trainers (id, specialization, bio, certificates, rating, is_available)
             VALUES ($1, NULL, NULL, NULL, NULL, $2)`,
            [userId, role_id === 2] // для тренера is_available=true, для остальных false
        );
        await pool.query('COMMIT');
        res.json({ id: userId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    const id = req.params.id;
    const { full_name, email, phone, role_id, is_active } = req.body;
    try {
        await pool.query(
            `UPDATE "Users" SET full_name=$1, email=$2, phone=$3, role_id=$4, is_active=$5 WHERE id=$6`,
            [full_name, email, phone, role_id, is_active, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.patch('/api/admin/users/:id/toggle-block', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query(`UPDATE "Users" SET is_active = NOT is_active WHERE id=$1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/backup', (req, res) => {
    res.json({ success: true, message: 'Резервная копия создана (имитация)' });
});

app.post('/api/admin/restore/:id', (req, res) => {
    res.json({ success: true, message: 'Восстановление выполнено (имитация)' });
});


// ========== Управление товарами ==========
app.post('/api/products', async (req, res) => {
    const { name, description, price, unit, stock, image, category } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO products (name, description, price, unit, stock_quantity, image_url, category, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW()) RETURNING id`,
            [name, description, price, unit, stock, image, category]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, price, unit, stock, image, category } = req.body;
    try {
        await pool.query(
            `UPDATE products SET name=$1, description=$2, price=$3, unit=$4, stock_quantity=$5, image_url=$6, category=$7 WHERE id=$8`,
            [name, description, price, unit, stock, image, category, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query(`UPDATE products SET is_active=false WHERE id=$1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Управление услугами ==========
app.post('/api/subscriptions', async (req, res) => {
    const { name, description, duration, price, access, is_active } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO subscription_tiers (name, description, duration_dayss, price, access_type, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
            [name, description, duration, price, access, is_active]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/subscriptions/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, duration, price, access, is_active } = req.body;
    try {
        await pool.query(
            `UPDATE subscription_tiers SET name=$1, description=$2, duration_dayss=$3, price=$4, access_type=$5, is_active=$6 WHERE id=$7`,
            [name, description, duration, price, access, is_active, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query(`UPDATE subscription_tiers SET is_active=false WHERE id=$1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Управление тренировками ==========
app.post('/api/trainings', async (req, res) => {
    const { type, trainer_id, name, start_time, end_time, max_participants, room } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO training_sessions (type, trainer_id, name, start_time, end_time, max_participants, room, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'запланировано', NOW()) RETURNING id`,
            [type, trainer_id, name, start_time, end_time, max_participants, room]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainings/:id', async (req, res) => {
    const id = req.params.id;
    const { type, name, start_time, end_time, max_participants, room, status } = req.body;
    try {
        await pool.query(
            `UPDATE training_sessions SET type=$1, name=$2, start_time=$3, end_time=$4, max_participants=$5, room=$6, status=$7 WHERE id=$8`,
            [type, name, start_time, end_time, max_participants, room, status, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/trainings/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query(`DELETE FROM training_sessions WHERE id=$1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Вспомогательная функция для проверки конфликта времени у клиента
async function checkClientTimeConflict(clientId, start, end, excludeBookingId = null) {
    let query = `
        SELECT b.id 
        FROM bookings b
        JOIN training_sessions ts ON b.session_id = ts.id
        WHERE b.client_id = $1 
          AND b.status = 'подтверждено'
          AND tstzrange(ts.start_time, ts.end_time) && tstzrange($2, $3)
    `;
    const params = [clientId, start, end];
    if (excludeBookingId) {
        query += ` AND b.id != $4`;
        params.push(excludeBookingId);
    }
    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

// ========== Бронирования ==========
app.post('/api/bookings', async (req, res) => {
    const { client_id, session_id, source } = req.body;
    try {
        // Получаем информацию о сессии
        const sessionRes = await pool.query(
            `SELECT max_participants, start_time, end_time,
                    (SELECT COUNT(*) FROM bookings WHERE session_id=$1 AND status='подтверждено') as booked
             FROM training_sessions WHERE id=$1`,
            [session_id]
        );
        if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Тренировка не найдена' });
        const { max_participants, booked, start_time, end_time } = sessionRes.rows[0];
        
        // Проверка свободных мест
        if (booked >= max_participants) return res.status(400).json({ error: 'Нет свободных мест' });

        // Проверка, не записан ли уже клиент на эту сессию
        const existing = await pool.query(
            `SELECT id FROM bookings WHERE client_id = $1 AND session_id = $2 AND status = 'подтверждено'`,
            [client_id, session_id]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Вы уже записаны на эту тренировку' });
        }

        // Проверка на пересечение с другими тренировками клиента
        const conflict = await checkClientTimeConflict(client_id, start_time, end_time);
        if (conflict) {
            return res.status(400).json({ error: 'У вас уже есть тренировка в это время' });
        }

        // Всё хорошо, создаём бронирование
        const result = await pool.query(
            `INSERT INTO bookings (client_id, session_id, status, booking_time, source)
             VALUES ($1, $2, 'подтверждено', NOW(), $3) RETURNING id`,
            [client_id, session_id, source]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Получаем информацию о бронировании, чтобы проверить, что это групповое занятие
        const bookingRes = await pool.query(
            `SELECT b.client_id, b.session_id, ts.type, ts.max_participants
             FROM bookings b
             JOIN training_sessions ts ON b.session_id = ts.id
             WHERE b.id = $1`,
            [id]
        );
        if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Бронь не найдена' });

        const { client_id, session_id, type } = bookingRes.rows[0];

        // Отменяем бронирование
        await pool.query(
            `UPDATE bookings SET status='отменено', cancelled_at=NOW() WHERE id=$1`,
            [id]
        );

        // Если это групповая тренировка, ничего дополнительно не делаем (место освобождается автоматически при следующем запросе)
        // Можно было бы логировать, но не обязательно

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Заказы товаров ==========
app.post('/api/orders', async (req, res) => {
    const { client_id, items } = req.body; // items: [{ product_id, quantity, price }]
    try {
        await pool.query('BEGIN');
        let total = 0;
        for (const item of items) total += item.price * item.quantity;

        const paymentRes = await pool.query(
            `INSERT INTO payments (client_id, amount, currency, payment_method, status, created_at)
             VALUES ($1, $2, 'руб', 'онлайн', 'проведён', NOW()) RETURNING id`,
            [client_id, total]
        );
        const paymentId = paymentRes.rows[0].id;

        for (const item of items) {
            const orderRes = await pool.query(
                `INSERT INTO orders (client_id, product_id, quantity, total_price, status, payment_id, created_at)
                 VALUES ($1, $2, $3, $4, 'оплачен', $5, NOW()) RETURNING id`,
                [client_id, item.product_id, item.quantity, item.price * item.quantity, paymentId]
            );

            await pool.query(
                `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id=$2`,
                [item.quantity, item.product_id]
            );

            const code = Math.floor(100000 + Math.random() * 900000);
            await pool.query(
                `UPDATE orders SET access_code=$1 WHERE id=$2`,
                [code.toString(), orderRes.rows[0].id]
            );
        }

        await pool.query('COMMIT');
        res.json({ success: true, paymentId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Покупка абонемента
app.post('/api/subscriptions/purchase', async (req, res) => {
    const { client_id, tier_id } = req.body;
    try {
        // Проверка активного абонемента
        const active = await pool.query(
            `SELECT id FROM client_subscriptions WHERE client_id = $1 AND status = 'активен' AND end_date > NOW()`,
            [client_id]
        );
        if (active.rows.length > 0) {
            return res.status(400).json({ error: 'Уже есть активный абонемент' });
        }

        const tierRes = await pool.query(`SELECT * FROM subscription_tiers WHERE id = $1`, [tier_id]);
        const tier = tierRes.rows[0];
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + tier.duration_dayss);

        const result = await pool.query(
            `INSERT INTO client_subscriptions (client_id, tier_id, start_date, end_date, status, auto_renew, price_paid, created_at)
             VALUES ($1, $2, $3, $4, 'активен', false, $5, NOW()) RETURNING id`,
            [client_id, tier_id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], tier.price]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Обновлённый эндпоинт тренировок клиента с session_id
app.get('/api/client/:id/trainings', async (req, res) => {
    const clientId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT b.id, ts.name, u.full_name as trainer, 
                    to_char(ts.start_time, 'YYYY-MM-DD HH24:MI') as date,
                    to_char(ts.end_time, 'YYYY-MM-DD HH24:MI') as end_date,
                    b.status, ts.id as session_id
             FROM bookings b
             JOIN training_sessions ts ON b.session_id = ts.id
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             WHERE b.client_id = $1
             ORDER BY ts.start_time DESC`,
            [clientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// Получение специализации тренера
app.get('/api/trainer/:id/specialization', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT specialization FROM trainers WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Trainer not found' });
        res.json({ specialization: result.rows[0].specialization });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Обновление специализации тренера
app.put('/api/trainer/:id/specialization', async (req, res) => {
    const { id } = req.params;
    const { specialization } = req.body;
    try {
        await pool.query('UPDATE trainers SET specialization = $1 WHERE id = $2', [specialization, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение заметок тренера о клиентах
app.get('/api/trainer/:id/client-notes', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT client_id, note FROM trainer_client_notes WHERE trainer_id = $1`,
            [id]
        );
        const notes = {};
        result.rows.forEach(row => notes[row.client_id] = row.note);
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Обновление заметки о клиенте
app.put('/api/trainer/:id/client-notes/:clientId', async (req, res) => {
    const { id, clientId } = req.params;
    const { note } = req.body;
    try {
        await pool.query(
            `INSERT INTO trainer_client_notes (trainer_id, client_id, note)
             VALUES ($1, $2, $3)
             ON CONFLICT (trainer_id, client_id) DO UPDATE SET note = EXCLUDED.note`,
            [id, clientId, note]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Управление типами групповых тренировок ==========
app.get('/api/trainer/:id/group-types', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, name, description FROM group_training_types WHERE trainer_id = $1 ORDER BY name',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/trainer/:id/group-types', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO group_training_types (trainer_id, name, description) VALUES ($1, $2, $3) RETURNING id',
            [id, name, description]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/group-types/:typeId', async (req, res) => {
    const { id, typeId } = req.params;
    const { name, description } = req.body;
    try {
        const check = await pool.query('SELECT id FROM group_training_types WHERE id = $1 AND trainer_id = $2', [typeId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your group type' });
        await pool.query(
            'UPDATE group_training_types SET name = $1, description = $2 WHERE id = $3',
            [name, description, typeId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/trainer/:id/group-types/:typeId', async (req, res) => {
    const { id, typeId } = req.params;
    try {
        const sessions = await pool.query('SELECT id FROM training_sessions WHERE group_type_id = $1', [typeId]);
        if (sessions.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete group type with existing sessions' });
        }
        await pool.query('DELETE FROM group_training_types WHERE id = $1 AND trainer_id = $2', [typeId, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Создание новой групповой тренировки (с проверкой пересечения)
app.post('/api/trainer/:id/group-sessions', async (req, res) => {
    const { id } = req.params;
    const { name, start_time, end_time, max_participants, room, group_type_id, price } = req.body;
    try {
        if (await checkSlotOverlap(id, start_time, end_time)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        const result = await pool.query(
            `INSERT INTO training_sessions (trainer_id, name, type, start_time, end_time, max_participants, room, status, group_type_id, price, created_at)
             VALUES ($1, $2, 'групповая', $3, $4, $5, $6, 'запланировано', $7, $8, NOW()) RETURNING id`,
            [id, name, start_time, end_time, max_participants, room, group_type_id, price]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Редактирование групповой тренировки (с проверкой пересечения)
app.put('/api/trainer/:id/group-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    const { name, start_time, end_time, max_participants, room, group_type_id, price } = req.body;
    try {
        const check = await pool.query('SELECT id FROM training_sessions WHERE id = $1 AND trainer_id = $2', [sessionId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        if (await checkSlotOverlap(id, start_time, end_time, sessionId)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        await pool.query(
            `UPDATE training_sessions SET name = $1, start_time = $2, end_time = $3, max_participants = $4, room = $5, group_type_id = $6, price = $7 WHERE id = $8`,
            [name, start_time, end_time, max_participants, room, group_type_id, price, sessionId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Удаление групповой тренировки
app.delete('/api/trainer/:id/group-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    try {
        const check = await pool.query('SELECT id FROM training_sessions WHERE id = $1 AND trainer_id = $2', [sessionId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        await pool.query('DELETE FROM bookings WHERE session_id = $1', [sessionId]);
        await pool.query('DELETE FROM training_sessions WHERE id = $1', [sessionId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение занятости тренера на конкретную дату (тренировки)
app.get('/api/trainer/:id/availability', async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const sessions = await pool.query(
            `SELECT ts.id, ts.name, ts.start_time, ts.end_time, ts.max_participants, ts.type,
                    (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked,
                    (SELECT json_agg(json_build_object('id', u.id, 'name', u.full_name)) FROM bookings b JOIN "Users" u ON b.client_id = u.id WHERE b.session_id = ts.id AND b.status = 'подтверждено') as clients
             FROM training_sessions ts
             WHERE ts.trainer_id = $1 AND ts.start_time >= $2 AND ts.start_time <= $3
             ORDER BY ts.start_time`,
            [id, startOfDay.toISOString(), endOfDay.toISOString()]
        );
        res.json(sessions.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение данных пользователя по ID (для контактов)
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, full_name, email, phone FROM "Users" WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Заметки о клиентах ==========
app.get('/api/trainer/:id/client-notes', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT client_id, note FROM trainer_client_notes WHERE trainer_id = $1',
            [id]
        );
        const notes = {};
        result.rows.forEach(row => notes[row.client_id] = row.note);
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/client-notes/:clientId', async (req, res) => {
    const { id, clientId } = req.params;
    const { note } = req.body;
    try {
        await pool.query(
            `INSERT INTO trainer_client_notes (trainer_id, client_id, note)
             VALUES ($1, $2, $3)
             ON CONFLICT (trainer_id, client_id) DO UPDATE SET note = EXCLUDED.note`,
            [id, clientId, note]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Групповые тренировки тренера ==========
app.get('/api/trainer/:id/group-sessions', async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, groupTypeId } = req.query;
    try {
        let query = `
            SELECT ts.id, ts.name, ts.type, ts.start_time, ts.end_time, ts.max_participants, ts.room,
            ts.group_type_id, gtt.name as group_name,
            ts.price,
            (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked
            FROM training_sessions ts
            LEFT JOIN group_training_types gtt ON ts.group_type_id = gtt.id
            WHERE ts.trainer_id = $1 AND ts.type = 'групповая'
        `;
        const params = [id];
        let paramIndex = 2;
        if (startDate && endDate) {
            query += ` AND ts.start_time >= $${paramIndex} AND ts.start_time <= $${paramIndex+1}`;
            params.push(startDate, endDate);
            paramIndex += 2;
        }
        if (groupTypeId && groupTypeId !== 'all') {
            query += ` AND ts.group_type_id = $${paramIndex}`;
            params.push(groupTypeId);
        }
        query += ` ORDER BY ts.start_time`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});



app.delete('/api/trainer/:id/group-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    try {
        const check = await pool.query('SELECT id FROM training_sessions WHERE id = $1 AND trainer_id = $2', [sessionId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        await pool.query('DELETE FROM bookings WHERE session_id = $1', [sessionId]);
        await pool.query('DELETE FROM training_sessions WHERE id = $1', [sessionId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Персональные слоты (расписание в тренажёрном зале) ==========
app.get('/api/trainer/:id/personal-sessions', async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const sessions = await pool.query(
            `SELECT ts.id, ts.start_time, ts.end_time, ts.max_participants, ts.type,
                    (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked,
                    (SELECT json_agg(json_build_object('id', u.id, 'name', u.full_name)) 
                     FROM bookings b 
                     JOIN "Users" u ON b.client_id = u.id 
                     WHERE b.session_id = ts.id AND b.status = 'подтверждено') as clients
             FROM training_sessions ts
             WHERE ts.trainer_id = $1 AND ts.type = 'персональная' 
               AND ts.start_time >= $2 AND ts.start_time <= $3
             ORDER BY ts.start_time`,
            [id, startOfDay.toISOString(), endOfDay.toISOString()]
        );
        res.json(sessions.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/trainer/:id/personal-sessions', async (req, res) => {
    const { id } = req.params;
    const { start_time, end_time, name = 'Персональная тренировка' } = req.body;
    try {
        // Проверка пересечения с любыми тренировками тренера
        if (await checkSlotOverlap(id, start_time, end_time)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        const result = await pool.query(
            `INSERT INTO training_sessions (trainer_id, name, type, start_time, end_time, max_participants, room, status, created_at)
             VALUES ($1, $2, 'персональная', $3, $4, 1, 'По договоренности', 'запланировано', NOW()) RETURNING id`,
            [id, name, start_time, end_time]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


app.put('/api/trainer/:id/personal-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    const { start_time, end_time } = req.body;
    try {
        if (await checkSlotOverlap(id, start_time, end_time, sessionId)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        const check = await pool.query('SELECT id FROM training_sessions WHERE id = $1 AND trainer_id = $2 AND type = $3', 
            [sessionId, id, 'персональная']);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        await pool.query(
            `UPDATE training_sessions SET start_time = $1, end_time = $2 WHERE id = $3`,
            [start_time, end_time, sessionId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/trainer/:id/personal-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    try {
        const check = await pool.query('SELECT id FROM training_sessions WHERE id = $1 AND trainer_id = $2 AND type = $3', 
            [sessionId, id, 'персональная']);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        const bookings = await pool.query('SELECT id FROM bookings WHERE session_id = $1 AND status = $2', [sessionId, 'подтверждено']);
        if (bookings.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete slot with active booking' });
        }
        await pool.query('DELETE FROM bookings WHERE session_id = $1', [sessionId]);
        await pool.query('DELETE FROM training_sessions WHERE id = $1', [sessionId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение доступных слотов для клиента (используется в модальном окне)
app.get('/api/trainer/:id/available-slots', async (req, res) => {
    const trainerId = req.params.id;
    try {
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const sessions = await pool.query(
            `SELECT ts.id, ts.start_time, ts.end_time
             FROM training_sessions ts
             WHERE ts.trainer_id = $1 AND ts.type = 'персональная'
               AND ts.start_time > $2 AND ts.start_time < $3
               AND ts.status = 'запланировано'
               AND (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') = 0
             ORDER BY ts.start_time`,
            [trainerId, now.toISOString(), sevenDaysLater.toISOString()]
        );
        const slots = sessions.rows.map(s => ({
            id: s.id,
            start: s.start_time,
            end: s.end_time,
            date: new Date(s.start_time).toISOString().split('T')[0],
            time: `${new Date(s.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        }));
        res.json(slots);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Отмена тренировки тренером ==========
app.put('/api/trainings/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        // Отменяем все подтверждённые брони этой сессии
        await pool.query(`UPDATE bookings SET status = 'отменено' WHERE session_id = $1 AND status = 'подтверждено'`, [id]);
        // Статус сессии оставляем как есть (запланировано), чтобы слот снова стал доступен
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение данных пользователя (для контактов)
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, full_name, email, phone FROM "Users" WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
}); 

// server.js – добавить после существующих маршрутов тренировок

app.get('/api/trainings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT ts.*, u.full_name as trainer_name
             FROM training_sessions ts
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             WHERE ts.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// ========== Управление специализациями (админ/менеджер) ==========
app.get('/api/specializations', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, description FROM specializations ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/specializations', async (req, res) => {
    const { name, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO specializations (name, description) VALUES ($1, $2) RETURNING id',
            [name, description]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/specializations/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        await pool.query(
            'UPDATE specializations SET name = $1, description = $2 WHERE id = $3',
            [name, description, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/specializations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Проверяем, используется ли специализация тренерами
        const used = await pool.query('SELECT trainer_id FROM trainer_specializations WHERE specialization_id = $1', [id]);
        if (used.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete specialization assigned to trainers' });
        }
        await pool.query('DELETE FROM specializations WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Специализации тренера ==========
app.get('/api/trainer/:id/specializations', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.id, s.name, s.description
             FROM specializations s
             JOIN trainer_specializations ts ON s.id = ts.specialization_id
             WHERE ts.trainer_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/specializations', async (req, res) => {
    const { id } = req.params;
    const { specializationIds } = req.body; // массив id
    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM trainer_specializations WHERE trainer_id = $1', [id]);
        for (const specId of specializationIds) {
            await pool.query(
                'INSERT INTO trainer_specializations (trainer_id, specialization_id) VALUES ($1, $2)',
                [id, specId]
            );
        }
        await pool.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение уникальных названий групповых тренировок
app.get('/api/group-training-names', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT name FROM training_sessions WHERE type = 'групповая' AND status = 'запланировано' ORDER BY name`
        );
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== Цена за час тренера ==========
app.get('/api/trainer/:id/hourly-rate', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT hourly_rate FROM trainers WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Trainer not found' });
        res.json({ hourly_rate: result.rows[0].hourly_rate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/hourly-rate', async (req, res) => {
    const { id } = req.params;
    const { hourly_rate } = req.body;
    try {
        await pool.query('UPDATE trainers SET hourly_rate = $1 WHERE id = $2', [hourly_rate, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});





// ========== Запуск сервера ==========
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});