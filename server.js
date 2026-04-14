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

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Папка для хранения бэкапов
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

async function logAction(userId, action, entityType, entityId, oldData, newData, req) {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        await pool.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [userId, action, entityType, entityId, oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null, ip, userAgent]
        );
    } catch (err) {
        console.error('Ошибка записи в audit_log:', err);
    }
}

// Получение списка бэкапов
app.get('/api/admin/backups', async (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(f => f.endsWith('.sql'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    filename: f,
                    size: stats.size,
                    created_at: stats.birthtime || stats.ctime
                };
            })
            .sort((a, b) => b.created_at - a.created_at);
        res.json(backups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка получения списка бэкапов' });
    }
});

// Создание бэкапа (SQL дамп)
app.post('/api/admin/backup', async (req, res) => {
    const body = req.body || {};
    const { user_id } = body;
    const adminId = user_id || 1;
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);
        
        const dbConfig = {
            user: pool.options.user,
            host: pool.options.host,
            database: pool.options.database,
            password: pool.options.password,
            port: pool.options.port
        };
        
        // Укажите полный путь к pg_dump (замените на ваш)
        const pgDumpPath = `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"`;
        const dumpCmd = `${pgDumpPath} --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.user} --format=plain --file="${filepath}" ${dbConfig.database}`;
        const env = { ...process.env, PGPASSWORD: dbConfig.password };
        
        await execPromise(dumpCmd, { env });
        
        await logAction(adminId, 'Создание резервной копии', 'backup', null, null, { filename }, req);
        res.json({ success: true, filename, size: fs.statSync(filepath).size });
    } catch (err) {
        console.error('Ошибка создания бэкапа:', err);
        res.status(500).json({ error: 'Ошибка создания резервной копии: ' + err.message });
    }
});


// Восстановление из бэкапа (ОСТОРОЖНО! Очищает текущую БД)
app.post('/api/admin/restore/:filename', async (req, res) => {
    const { filename } = req.params;
    const body = req.body || {};
    const { user_id } = body;
    const adminId = user_id || 1;
    const safeName = path.basename(filename);
    const filepath = path.join(BACKUP_DIR, safeName);
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Файл бэкапа не найден' });
    }

    try {
        const dbConfig = {
            user: pool.options.user,
            host: pool.options.host,
            database: pool.options.database,
            password: pool.options.password,
            port: pool.options.port
        };

        // 1. Очищаем базу (удаляем схему public)
        await pool.query('DROP SCHEMA public CASCADE');
        await pool.query('CREATE SCHEMA public');
        await pool.query('GRANT ALL ON SCHEMA public TO postgres');

        // 2. Полный путь к psql (как в ручной команде)
        const psqlPath = `"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"`;
        const command = `${psqlPath} -U ${dbConfig.user} -d ${dbConfig.database} -h ${dbConfig.host} -p ${dbConfig.port} -f "${filepath}"`;
        const env = { ...process.env, PGPASSWORD: dbConfig.password };

        // shell: true – запускаем через cmd.exe
        const { stdout, stderr } = await execPromise(command, { env, shell: true });
        
        if (stderr && !stderr.includes('NOTICE')) {
            console.error('Ошибка psql:', stderr);
            return res.status(500).json({ error: 'Ошибка восстановления: ' + stderr });
        }

        await logAction(adminId, 'Восстановление из резервной копии', 'backup', null, null, { filename }, req);
        res.json({ success: true, message: 'База данных восстановлена из бэкапа' });
    } catch (err) {
        console.error('Ошибка восстановления:', err);
        res.status(500).json({ error: 'Ошибка восстановления: ' + err.message });
    }
});


// Скачивание файла бэкапа
app.get('/api/admin/download-backup/:filename', async (req, res) => {
    const { filename } = req.params;
    const safeName = path.basename(filename);
    const filepath = path.join(BACKUP_DIR, safeName);
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Файл не найден' });
    }
    res.download(filepath);
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

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Раздача статических файлов из корня проекта
app.use(express.static(__dirname));

// Маршруты для HTML-страниц
const pages = ['index', 'login', 'profile', 'products', 'services', 'trainers', 'schedule', 'cart'];
pages.forEach(page => {
    app.get(`/${page}.html`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});



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

// Сначала all
app.get('/api/trainers/all', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.id, u.full_name as name
             FROM trainers t
             JOIN "Users" u ON t.id = u.id
             WHERE u.role_id = 2`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Потом :id
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

app.put('/api/trainer/:id/bio', async (req, res) => {
    const { id } = req.params;
    const { bio, user_id } = req.body;
    const userId = user_id || id;
    try {
        const old = await pool.query('SELECT bio FROM trainers WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Trainer not found' });
        await pool.query('UPDATE trainers SET bio = $1 WHERE id = $2', [bio, id]);
        await logAction(userId, 'Изменение описания', 'trainer', id, { bio: old.rows[0].bio }, { bio }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.role_id, r.name as role_name, u.photo_url
             FROM "Users" u
             JOIN roles r ON u.role_id = r.id
             WHERE u.email = $1 AND u.is_active = true`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const user = result.rows[0];
        
        if (password !== '123') {
            return res.status(401).json({ error: 'Неверный email или пароль' });
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
        
        // Обновляем last_login
        await pool.query('UPDATE "Users" SET last_login = NOW() WHERE id = $1', [user.id]);
        
        // Логируем вход
        await logAction(user.id, 'Вход в систему', 'auth', user.id, null, null, req);
        
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

app.post('/api/register', async (req, res) => {
    const { full_name, email, phone, password, role_id = 3 } = req.body;
    try {
        const emailCheck = await pool.query('SELECT id FROM "Users" WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        const phoneCheck = await pool.query('SELECT id FROM "Users" WHERE phone = $1', [phone]);
        if (phoneCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
        }

        await pool.query('BEGIN');
        const seqRes = await pool.query(`SELECT nextval('users_id_seq') as next_id`);
        const nextId = seqRes.rows[0].next_id;

        await pool.query(
            `INSERT INTO trainers (id, specialization, bio, certificates, rating, is_available)
             VALUES ($1, NULL, NULL, NULL, NULL, $2)`,
            [nextId, role_id === 2]
        );

        await pool.query(
            `INSERT INTO "Users" (id, full_name, email, phone, password_hash, role_id, photo_url, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NULL, false, NOW())`,
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

app.get('/api/client/:id/all-orders', async (req, res) => {
    const clientId = req.params.id;
    try {
        const productOrders = await pool.query(
            `SELECT o.id, p.name, o.total_price as total, o.status, o.created_at as date,
                    'товар' as type
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.client_id = $1`,
            [clientId]
        );
        const subscriptions = await pool.query(
            `SELECT cs.id, st.name, cs.price_paid as total, cs.status, cs.created_at as date,
                    'абонемент' as type
             FROM client_subscriptions cs
             JOIN subscription_tiers st ON cs.tier_id = st.id
             WHERE cs.client_id = $1`,
            [clientId]
        );
        const allOrders = [...productOrders.rows, ...subscriptions.rows].sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(allOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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

// ========== Групповые тренировки тренера ==========
app.get('/api/trainer/:id/group-sessions', async (req, res) => {
    const trainerId = req.params.id;
    const { startDate, endDate, groupTypeId } = req.query;
    try {
        let query = `
            SELECT ts.id, ts.name, ts.type, ts.start_time, ts.end_time, ts.max_participants, ts.room,
                   ts.group_type_id, gtt.name as group_name, ts.price,
                   (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked
            FROM training_sessions ts
            LEFT JOIN group_training_types gtt ON ts.group_type_id = gtt.id
            WHERE ts.trainer_id = $1 AND ts.type = 'групповая'
        `;
        const params = [trainerId];
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

app.get('/api/manager/clients', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name as name, u.phone, u.email, u.is_active,
                    COALESCE(st.name, 'Нет') as subscription,
                    CASE 
                        WHEN cs.id IS NOT NULL OR future_bookings.id IS NOT NULL THEN 'active'
                        ELSE 'inactive'
                    END as activity_status
             FROM "Users" u
             LEFT JOIN client_subscriptions cs ON u.id = cs.client_id AND cs.status = 'активен' AND cs.end_date > NOW()
             LEFT JOIN LATERAL (
                 SELECT b.id
                 FROM bookings b
                 JOIN training_sessions ts ON b.session_id = ts.id
                 WHERE b.client_id = u.id AND b.status = 'подтверждено' AND ts.start_time > NOW()
                 LIMIT 1
             ) future_bookings ON true
             LEFT JOIN subscription_tiers st ON cs.tier_id = st.id
             WHERE u.role_id = 3
             ORDER BY u.id`
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
            `SELECT ts.id, ts.name, ts.type, ts.trainer_id, u.full_name as trainer, 
                    ts.start_time, ts.end_time,
                    ts.room, ts.max_participants as max, ts.price,
                    (SELECT COUNT(*) FROM bookings b WHERE b.session_id = ts.id AND b.status = 'подтверждено') as booked
             FROM training_sessions ts
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             ORDER BY ts.start_time DESC`  // сортировка на уровне БД
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение всех услуг (включая неактивные)
app.get('/api/subscriptions/all', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, description, duration_dayss as duration, price, access_type as access, is_active FROM subscription_tiers ORDER BY id'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение всех уникальных типов доступа
app.get('/api/subscription-access-types/all', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT access_type FROM subscription_tiers WHERE access_type IS NOT NULL AND access_type != \'\' ORDER BY access_type'
        );
        res.json(result.rows.map(r => r.access_type));
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
        
        const usersWithStatus = await Promise.all(result.rows.map(async (user) => {
            // is_blocked = true, если пользователь заблокирован (u.is_active = false)
            const isBlocked = !user.is_active;
            let isActive = false; // по умолчанию для клиентов
            
            if (user.role === 'Клиент') {
                // Проверка активного абонемента
                const subRes = await pool.query(
                    `SELECT id FROM client_subscriptions 
                     WHERE client_id = $1 AND status = 'активен' AND end_date > NOW()`,
                    [user.id]
                );
                const hasActiveSubscription = subRes.rows.length > 0;
                
                // Проверка будущих тренировок
                const bookingRes = await pool.query(
                    `SELECT b.id
                     FROM bookings b
                     JOIN training_sessions ts ON b.session_id = ts.id
                     WHERE b.client_id = $1 AND b.status = 'подтверждено' AND ts.start_time > NOW()
                     LIMIT 1`,
                    [user.id]
                );
                const hasFutureBooking = bookingRes.rows.length > 0;
                
                isActive = hasActiveSubscription || hasFutureBooking;
            } else {
                // Для не-клиентов активен, если не заблокирован
                isActive = !isBlocked;
            }
            
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                is_blocked: isBlocked,
                is_active: isActive
            };
        }));
        
        res.json(usersWithStatus);
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

app.post('/api/admin/settings', async (req, res) => {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
    }
    try {
        // Проверка на существование ключа
        const existing = await pool.query('SELECT key FROM system_settings WHERE key = $1', [key]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Setting with this key already exists' });
        }
        await pool.query(
            `INSERT INTO system_settings (key, value, description, updated_at)
             VALUES ($1, $2, $3, NOW())`,
            [key, JSON.stringify(value), description || null]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/admin/settings/:key', async (req, res) => {
    const { key } = req.params;
    const { value, description } = req.body;
    if (value === undefined) {
        return res.status(400).json({ error: 'Value is required' });
    }
    try {
        const result = await pool.query(
            `UPDATE system_settings SET value = $1, description = $2, updated_at = NOW()
             WHERE key = $3`,
            [JSON.stringify(value), description || null, key]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/admin/settings/:key', async (req, res) => {
    const { key } = req.params;
    try {
        const result = await pool.query('DELETE FROM system_settings WHERE key = $1', [key]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение публичных настроек для отображения на сайте
app.get('/api/public-settings', async (req, res) => {
    try {
        // Ключи, которые можно отображать публично
        const publicKeys = ['support_work_hours', 'club_work_hours', 'contact_phone', 'contact_email', 'contact_address'];
        const result = await pool.query(
            `SELECT key, value FROM system_settings WHERE key = ANY($1)`,
            [publicKeys]
        );
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        // Если нет явно заданных часов работы клуба, то по умолчанию 24/7
        if (!settings.club_work_hours) settings.club_work_hours = 'Круглосуточно';
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const { role, action, search, date_from, date_to, limit = 200 } = req.query;
        let query = `
            SELECT al.id, al.user_id, u.email as user_email, r.name as user_role, 
                   al.action, al.entity_type, al.entity_id, 
                   al.old_data, al.new_data, 
                   al.ip_address, al.user_agent,
                   to_char(al.created_at, 'YYYY-MM-DD HH24:MI:SS') as time
            FROM audit_log al
            JOIN "Users" u ON al.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (role && role !== 'all') {
            query += ` AND r.name = $${paramIndex++}`;
            params.push(role);
        }
        if (action && action !== 'all') {
            // Общие категории ищем по шаблону
            if (action === 'Создание') {
                query += ` AND al.action LIKE $${paramIndex++}`;
                params.push('Создание%');
            } else if (action === 'Обновление') {
                query += ` AND al.action LIKE $${paramIndex++}`;
                params.push('%Обновление%');
            } else if (action === 'Удаление') {
                query += ` AND al.action LIKE $${paramIndex++}`;
                params.push('%Удаление%');
            } else {
                // Остальные действия – точное совпадение
                query += ` AND al.action = $${paramIndex++}`;
                params.push(action);
            }
        }
        if (search) {
            query += ` AND (u.email ILIKE $${paramIndex++} OR al.action ILIKE $${paramIndex++} OR al.entity_type ILIKE $${paramIndex++})`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (date_from) {
            query += ` AND al.created_at >= $${paramIndex++}`;
            params.push(date_from);
        }
        if (date_to) {
            query += ` AND al.created_at <= $${paramIndex++}`;
            params.push(date_to);
        }
        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/users', async (req, res) => {
    const { full_name, email, phone, password, role_id, photo_url, user_id } = req.body;
    const adminId = user_id || 1;
    try {
        await pool.query('BEGIN');
        const seqRes = await pool.query(`SELECT nextval('users_id_seq') as next_id`);
        const nextId = seqRes.rows[0].next_id;
        await pool.query(
            `INSERT INTO trainers (id, specialization, bio, certificates, rating, is_available)
             VALUES ($1, NULL, NULL, NULL, NULL, $2)`,
            [nextId, role_id === 2]
        );
        await pool.query(
            `INSERT INTO "Users" (id, full_name, email, phone, password_hash, role_id, photo_url, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
            [nextId, full_name, email, phone, password, role_id, photo_url]
        );
        await pool.query('COMMIT');
        await logAction(adminId, 'Создание пользователя', 'user', nextId, null, { full_name, email, phone, role_id }, req);
        res.json({ id: nextId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    const id = req.params.id;
    const { full_name, email, phone, role_id, is_active, user_id } = req.body;
    const adminId = user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM "Users" WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        const emailCheck = await pool.query('SELECT id FROM "Users" WHERE email = $1 AND id != $2', [email, id]);
        if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'Email уже используется' });
        const phoneCheck = await pool.query('SELECT id FROM "Users" WHERE phone = $1 AND id != $2', [phone, id]);
        if (phoneCheck.rows.length > 0) return res.status(400).json({ error: 'Телефон уже используется' });
        
        const currentUser = await pool.query('SELECT role_id FROM "Users" WHERE id = $1', [id]);
        const oldRoleId = currentUser.rows[0].role_id;
        
        await pool.query('BEGIN');
        await pool.query(
            `UPDATE "Users" SET full_name=$1, email=$2, phone=$3, role_id=$4, is_active=$5 WHERE id=$6`,
            [full_name, email, phone, role_id, is_active, id]
        );
        if (role_id === 2 && oldRoleId !== 2) {
            const trainerExists = await pool.query('SELECT id FROM trainers WHERE id = $1', [id]);
            if (trainerExists.rows.length === 0) {
                await pool.query(`INSERT INTO trainers (id, specialization, bio, certificates, rating, is_available, hourly_rate) VALUES ($1, NULL, NULL, NULL, NULL, true, NULL)`, [id]);
            }
        } else if (role_id !== 2 && oldRoleId === 2) {
            await pool.query(`UPDATE trainers SET is_available = false WHERE id = $1`, [id]);
        }
        await pool.query('COMMIT');
        
        const newData = { full_name, email, phone, role_id, is_active };
        await logAction(adminId, 'Обновление пользователя', 'user', id, old.rows[0], newData, req);
        res.json({ success: true });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


app.patch('/api/admin/users/:id/toggle-block', async (req, res) => {
    const id = req.params.id;
    const adminId = req.body.user_id || 1;
    try {
        const old = await pool.query('SELECT is_active FROM "Users" WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        const newIsActive = !old.rows[0].is_active;
        await pool.query(`UPDATE "Users" SET is_active = $1 WHERE id=$2`, [newIsActive, id]);
        await logAction(adminId, newIsActive ? 'Разблокировка пользователя' : 'Блокировка пользователя', 'user', id, { is_active: old.rows[0].is_active }, { is_active: newIsActive }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, description, price, unit, stock, image, category, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const result = await pool.query(
            `INSERT INTO products (name, description, price, unit, stock_quantity, image_url, category, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW()) RETURNING id`,
            [name, description, price, unit, stock, image, category]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Создание товара', 'product', newId, null, req.body, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, price, unit, stock, image, category, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
        await pool.query(
            `UPDATE products SET name=$1, description=$2, price=$3, unit=$4, stock_quantity=$5, image_url=$6, category=$7 WHERE id=$8`,
            [name, description, price, unit, stock, image, category, id]
        );
        await logAction(userId, 'Обновление товара', 'product', id, old.rows[0], req.body, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const id = req.params.id;
    const userId = req.body.user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
        await pool.query(`UPDATE products SET is_active=false WHERE id=$1`, [id]);
        await logAction(userId, 'Удаление товара (деактивация)', 'product', id, old.rows[0], { is_active: false }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/subscriptions', async (req, res) => {
    const { name, description, duration, price, access, is_active, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const result = await pool.query(
            `INSERT INTO subscription_tiers (name, description, duration_dayss, price, access_type, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
            [name, description, duration, price, access, is_active]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Создание услуги', 'subscription_tier', newId, null, req.body, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/subscriptions/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, duration, price, access, is_active, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM subscription_tiers WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Услуга не найдена' });
        await pool.query(
            `UPDATE subscription_tiers SET name=$1, description=$2, duration_dayss=$3, price=$4, access_type=$5, is_active=$6 WHERE id=$7`,
            [name, description, duration, price, access, is_active, id]
        );
        await logAction(userId, 'Обновление услуги', 'subscription_tier', id, old.rows[0], req.body, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
    const id = req.params.id;
    const userId = req.body.user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM subscription_tiers WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Услуга не найдена' });
        await pool.query(`UPDATE subscription_tiers SET is_active=false WHERE id=$1`, [id]);
        await logAction(userId, 'Удаление услуги (деактивация)', 'subscription_tier', id, old.rows[0], { is_active: false }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/trainings', async (req, res) => {
    const { type, trainer_id, name, start_time, end_time, max_participants, room, price, group_type_id, user_id } = req.body;
    const userId = user_id || 1; // временно, заменить на ID из токена
    
    if (!type || !trainer_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }
    
    try {
        if (await checkSlotOverlap(trainer_id, start_time, end_time)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        const result = await pool.query(
            `INSERT INTO training_sessions (type, trainer_id, name, start_time, end_time, max_participants, room, status, price, group_type_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'запланировано', $8, $9, NOW()) RETURNING id`,
            [type, trainer_id, name, start_time, end_time, max_participants, room, price, group_type_id || null]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Создание тренировки', 'training_session', newId, null, req.body, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainings/:id', async (req, res) => {
    const id = req.params.id;
    const { type, trainer_id, name, start_time, end_time, max_participants, room, status, price, group_type_id, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const current = await pool.query('SELECT * FROM training_sessions WHERE id = $1', [id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Тренировка не найдена' });
        const oldData = current.rows[0];
        
        const newType = type !== undefined ? type : oldData.type;
        const newTrainerId = trainer_id !== undefined ? trainer_id : oldData.trainer_id;
        const newName = name !== undefined ? name : oldData.name;
        const newStartTime = start_time !== undefined ? start_time : oldData.start_time;
        const newEndTime = end_time !== undefined ? end_time : oldData.end_time;
        const newMaxParticipants = max_participants !== undefined ? max_participants : oldData.max_participants;
        const newRoom = room !== undefined ? room : oldData.room;
        const newStatus = status !== undefined ? status : oldData.status;
        const newPrice = price !== undefined ? price : oldData.price;
        const newGroupTypeId = group_type_id !== undefined ? group_type_id : oldData.group_type_id;
        
        if (newStartTime !== oldData.start_time || newEndTime !== oldData.end_time || newTrainerId !== oldData.trainer_id) {
            if (await checkSlotOverlap(newTrainerId, newStartTime, newEndTime, id)) {
                return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
            }
        }
        
        const finalGroupTypeId = (newType === 'персональная') ? null : newGroupTypeId;
        await pool.query(
            `UPDATE training_sessions SET type=$1, trainer_id=$2, name=$3, start_time=$4, end_time=$5, max_participants=$6, room=$7, status=$8, price=$9, group_type_id=$10 WHERE id=$11`,
            [newType, newTrainerId, newName, newStartTime, newEndTime, newMaxParticipants, newRoom, newStatus, newPrice, finalGroupTypeId, id]
        );
        
        const newData = { type: newType, trainer_id: newTrainerId, name: newName, start_time: newStartTime, end_time: newEndTime, max_participants: newMaxParticipants, room: newRoom, status: newStatus, price: newPrice, group_type_id: finalGroupTypeId };
        await logAction(userId, 'Обновление тренировки', 'training_session', id, oldData, newData, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.delete('/api/trainings/:id', async (req, res) => {
    const id = req.params.id;
    const userId = req.body.user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM training_sessions WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Тренировка не найдена' });
        await pool.query('DELETE FROM bookings WHERE session_id = $1', [id]);
        await pool.query('DELETE FROM training_sessions WHERE id = $1', [id]);
        await logAction(userId, 'Удаление тренировки', 'training_session', id, old.rows[0], null, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение всех типов групповых тренировок (для менеджера)
app.get('/api/group-training-types/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, description FROM group_training_types ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение одной тренировки по ID
app.get('/api/trainings/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(
            `SELECT ts.*, u.full_name as trainer_name
             FROM training_sessions ts
             JOIN trainers t ON ts.trainer_id = t.id
             JOIN "Users" u ON t.id = u.id
             WHERE ts.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Training session not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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

app.post('/api/bookings', async (req, res) => {
    const { client_id, session_id, source, user_id } = req.body;
    const userId = user_id || client_id;
    try {
        const sessionRes = await pool.query(
            `SELECT max_participants, start_time, end_time, (SELECT COUNT(*) FROM bookings WHERE session_id=$1 AND status='подтверждено') as booked FROM training_sessions WHERE id=$1`,
            [session_id]
        );
        if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Тренировка не найдена' });
        const { max_participants, booked, start_time, end_time } = sessionRes.rows[0];
        if (new Date(start_time) <= new Date()) return res.status(400).json({ error: 'Нельзя записаться на уже начавшуюся тренировку' });
        if (booked >= max_participants) return res.status(400).json({ error: 'Нет свободных мест' });
        const existing = await pool.query(`SELECT id FROM bookings WHERE client_id = $1 AND session_id = $2 AND status = 'подтверждено'`, [client_id, session_id]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Вы уже записаны на эту тренировку' });
        const conflict = await checkClientTimeConflict(client_id, start_time, end_time);
        if (conflict) return res.status(400).json({ error: 'У вас уже есть тренировка в это время' });
        
        const result = await pool.query(
            `INSERT INTO bookings (client_id, session_id, status, booking_time, source) VALUES ($1, $2, 'подтверждено', NOW(), $3) RETURNING id`,
            [client_id, session_id, source]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Запись на тренировку', 'booking', newId, null, { session_id, source }, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    const id = req.params.id;
    let userId = req.body.user_id || 1;
    try {
        const bookingRes = await pool.query(`SELECT b.client_id, b.session_id, ts.type, ts.max_participants FROM bookings b JOIN training_sessions ts ON b.session_id = ts.id WHERE b.id = $1`, [id]);
        if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Бронь не найдена' });
        const { client_id, session_id, type } = bookingRes.rows[0];
        userId = client_id; // логируем от имени клиента
        await pool.query(`UPDATE bookings SET status='отменено', cancelled_at=NOW() WHERE id=$1`, [id]);
        await logAction(userId, 'Отмена записи', 'booking', id, { status: 'подтверждено' }, { status: 'отменено' }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/orders', async (req, res) => {
    const { client_id, items, user_id } = req.body;
    const userId = user_id || client_id;
    try {
        await pool.query('BEGIN');
        let total = 0;
        for (const item of items) {
            const productRes = await pool.query('SELECT stock_quantity FROM products WHERE id = $1', [item.product_id]);
            if (productRes.rows.length === 0) throw new Error('Товар не найден');
            const stock = productRes.rows[0].stock_quantity;
            if (stock < item.quantity) throw new Error(`Недостаточно товара ${item.product_id} на складе`);
            total += item.price * item.quantity;
        }
        const paymentRes = await pool.query(`INSERT INTO payments (client_id, amount, currency, payment_method, status, created_at) VALUES ($1, $2, 'руб', 'онлайн', 'проведён', NOW()) RETURNING id`, [client_id, total]);
        const paymentId = paymentRes.rows[0].id;
        const orderIds = [];
        for (const item of items) {
            const orderRes = await pool.query(`INSERT INTO orders (client_id, product_id, quantity, total_price, status, payment_id, created_at) VALUES ($1, $2, $3, $4, 'оплачен', $5, NOW()) RETURNING id`, [client_id, item.product_id, item.quantity, item.price * item.quantity, paymentId]);
            const orderId = orderRes.rows[0].id;
            orderIds.push(orderId);
            await pool.query(`UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id=$2`, [item.quantity, item.product_id]);
            const code = Math.floor(100000 + Math.random() * 900000);
            await pool.query(`UPDATE orders SET access_code=$1 WHERE id=$2`, [code.toString(), orderId]);
        }
        await pool.query('COMMIT');
        await logAction(userId, 'Оформление заказа', 'order', orderIds[0], null, { items, total, paymentId }, req);
        res.json({ success: true, paymentId });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.post('/api/subscriptions/purchase', async (req, res) => {
    const { client_id, tier_id, user_id } = req.body;
    const userId = user_id || client_id;
    try {
        await pool.query('BEGIN');
        const active = await pool.query(`SELECT id FROM client_subscriptions WHERE client_id = $1 AND status = 'активен' AND end_date > NOW()`, [client_id]);
        if (active.rows.length > 0) {
            await pool.query('ROLLBACK');
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
        await pool.query('COMMIT');
        await logAction(userId, 'Покупка абонемента', 'client_subscription', result.rows[0].id, null, { tier_id, price: tier.price }, req);
        res.json({ id: result.rows[0].id });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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

app.put('/api/trainer/:id/client-notes/:clientId', async (req, res) => {
    const { id, clientId } = req.params;
    const { note, user_id } = req.body;
    const userId = user_id || id;
    try {
        const old = await pool.query('SELECT note FROM trainer_client_notes WHERE trainer_id = $1 AND client_id = $2', [id, clientId]);
        await pool.query(
            `INSERT INTO trainer_client_notes (trainer_id, client_id, note) VALUES ($1, $2, $3)
             ON CONFLICT (trainer_id, client_id) DO UPDATE SET note = EXCLUDED.note`,
            [id, clientId, note]
        );
        await logAction(userId, 'Изменение заметки о клиенте', 'trainer_client_note', null, old.rows[0] || null, { note }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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
    const { name, description, user_id } = req.body;
    const userId = user_id || id;
    try {
        const result = await pool.query('INSERT INTO group_training_types (trainer_id, name, description) VALUES ($1, $2, $3) RETURNING id', [id, name, description]);
        await logAction(userId, 'Создание группы тренировок', 'group_training_type', result.rows[0].id, null, { name, description }, req);
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/group-types/:typeId', async (req, res) => {
    const { id, typeId } = req.params;
    const { name, description, user_id } = req.body;
    const userId = user_id || id;
    try {
        const check = await pool.query('SELECT id FROM group_training_types WHERE id = $1 AND trainer_id = $2', [typeId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your group type' });
        const old = await pool.query('SELECT * FROM group_training_types WHERE id = $1', [typeId]);
        await pool.query('UPDATE group_training_types SET name = $1, description = $2 WHERE id = $3', [name, description, typeId]);
        await logAction(userId, 'Обновление группы тренировок', 'group_training_type', typeId, old.rows[0], { name, description }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/trainer/:id/group-types/:typeId', async (req, res) => {
    const { id, typeId } = req.params;
    const userId = req.body.user_id || id;
    try {
        const old = await pool.query('SELECT * FROM group_training_types WHERE id = $1', [typeId]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Group type not found' });
        const sessions = await pool.query('SELECT id FROM training_sessions WHERE group_type_id = $1', [typeId]);
        if (sessions.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete group type with existing sessions' });
        }
        await pool.query('DELETE FROM group_training_types WHERE id = $1 AND trainer_id = $2', [typeId, id]);
        await logAction(userId, 'Удаление группы тренировок', 'group_training_type', typeId, old.rows[0], null, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/trainer/:id/group-sessions', async (req, res) => {
    const { id } = req.params;
    const { name, start_time, end_time, max_participants, room, group_type_id, price, user_id } = req.body;
    const userId = user_id || id;

    try {
        if (await checkSlotOverlap(id, start_time, end_time)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        const result = await pool.query(
            `INSERT INTO training_sessions (trainer_id, name, type, start_time, end_time, max_participants, room, status, group_type_id, price, created_at)
             VALUES ($1, $2, 'групповая', $3, $4, $5, $6, 'запланировано', $7, $8, NOW()) RETURNING id`,
            [id, name, start_time, end_time, max_participants, room, group_type_id, price]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Создание групповой тренировки', 'training_session', newId, null, req.body, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/group-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    const { name, start_time, end_time, max_participants, room, group_type_id, price, user_id } = req.body;
    const userId = user_id || id;

    try {
        const check = await pool.query('SELECT * FROM training_sessions WHERE id = $1 AND trainer_id = $2', [sessionId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        const oldData = check.rows[0];

        if (await checkSlotOverlap(id, start_time, end_time, sessionId)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        await pool.query(
            `UPDATE training_sessions SET name = $1, start_time = $2, end_time = $3, max_participants = $4, room = $5, group_type_id = $6, price = $7 WHERE id = $8`,
            [name, start_time, end_time, max_participants, room, group_type_id, price, sessionId]
        );
        await logAction(userId, 'Обновление групповой тренировки', 'training_session', sessionId, oldData, req.body, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/trainer/:id/group-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    const userId = req.body.user_id || id;

    try {
        const check = await pool.query('SELECT * FROM training_sessions WHERE id = $1 AND trainer_id = $2', [sessionId, id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not your session' });
        const oldData = check.rows[0];

        await pool.query('DELETE FROM bookings WHERE session_id = $1', [sessionId]);
        await pool.query('DELETE FROM training_sessions WHERE id = $1', [sessionId]);

        await logAction(userId, 'Удаление групповой тренировки', 'training_session', sessionId, oldData, null, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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

app.put('/api/trainings/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`UPDATE bookings SET status = 'отменено' WHERE session_id = $1 AND status = 'подтверждено'`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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
    const { start_time, end_time, name, user_id } = req.body;
    const userId = user_id || id;

    try {
        if (await checkSlotOverlap(id, start_time, end_time)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }
        const result = await pool.query(
            `INSERT INTO training_sessions (trainer_id, name, type, start_time, end_time, max_participants, room, status, created_at)
             VALUES ($1, $2, 'персональная', $3, $4, 1, 'По договоренности', 'запланировано', NOW()) RETURNING id`,
            [id, name || 'Персональная тренировка', start_time, end_time]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Создание персонального слота', 'personal_session', newId, null, { start_time, end_time, name }, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/trainer/:id/personal-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    const { start_time, end_time, user_id } = req.body;
    const userId = user_id || id; // ID тренера (или того, кто выполняет действие)

    try {
        // Проверяем, существует ли слот и принадлежит ли тренеру
        const slotCheck = await pool.query(
            'SELECT * FROM training_sessions WHERE id = $1 AND trainer_id = $2 AND type = $3',
            [sessionId, id, 'персональная']
        );
        if (slotCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Слот не найден или не принадлежит этому тренеру' });
        }
        const oldSlot = slotCheck.rows[0];

        // Проверка, есть ли на этот слот подтверждённые брони
        const bookings = await pool.query(
            'SELECT id FROM bookings WHERE session_id = $1 AND status = $2',
            [sessionId, 'подтверждено']
        );
        if (bookings.rows.length > 0) {
            return res.status(400).json({ error: 'Нельзя изменить слот, на который уже записан клиент' });
        }

        // Проверка пересечения с другими тренировками этого тренера (исключая текущий слот)
        if (await checkSlotOverlap(id, start_time, end_time, sessionId)) {
            return res.status(400).json({ error: 'Это время уже занято другой тренировкой' });
        }

        // Обновляем слот
        await pool.query(
            `UPDATE training_sessions 
             SET start_time = $1, end_time = $2 
             WHERE id = $3`,
            [start_time, end_time, sessionId]
        );

        // Логируем действие
        await logAction(userId, 'Обновление персонального слота', 'personal_session', sessionId, oldSlot, { start_time, end_time }, req);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.delete('/api/trainer/:id/personal-sessions/:sessionId', async (req, res) => {
    const { id, sessionId } = req.params;
    const userId = req.body.user_id || id;

    try {
        // Проверяем существование и принадлежность
        const slotCheck = await pool.query(
            'SELECT * FROM training_sessions WHERE id = $1 AND trainer_id = $2 AND type = $3',
            [sessionId, id, 'персональная']
        );
        if (slotCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Слот не найден или не принадлежит этому тренеру' });
        }
        const oldSlot = slotCheck.rows[0];

        // Проверяем, есть ли подтверждённые брони – удалять нельзя
        const bookings = await pool.query(
            'SELECT id FROM bookings WHERE session_id = $1 AND status = $2',
            [sessionId, 'подтверждено']
        );
        if (bookings.rows.length > 0) {
            return res.status(400).json({ error: 'Нельзя удалить слот с активной записью' });
        }

        // Удаляем связанные брони (если есть отменённые или какие-либо)
        await pool.query('DELETE FROM bookings WHERE session_id = $1', [sessionId]);
        // Удаляем сам слот
        await pool.query('DELETE FROM training_sessions WHERE id = $1', [sessionId]);

        // Логируем действие
        await logAction(userId, 'Удаление персонального слота', 'personal_session', sessionId, oldSlot, null, req);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

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
    const { hourly_rate, user_id } = req.body;
    const userId = user_id || id;
    try {
        const old = await pool.query('SELECT hourly_rate FROM trainers WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Trainer not found' });
        await pool.query('UPDATE trainers SET hourly_rate = $1 WHERE id = $2', [hourly_rate, id]);
        await logAction(userId, 'Изменение цены за час', 'trainer', id, { hourly_rate: old.rows[0].hourly_rate }, { hourly_rate }, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/specializations', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, description FROM specializations ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение активного гостевого кода клиента
// Получение активного гостевого кода клиента
app.get('/api/client/:id/active-guest-code', async (req, res) => {
    const clientId = req.params.id;
    try {
        const result = await pool.query(
            `SELECT code, valid_until 
             FROM temporary_codes 
             WHERE client_id = $1 AND type = 'guest' AND valid_until > NOW() AND used_count < max_uses
             ORDER BY created_at DESC LIMIT 1`,
            [clientId]
        );
        if (result.rows.length === 0) return res.json({ code: null });
        res.json({ code: result.rows[0].code, valid_until: result.rows[0].valid_until });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Генерация гостевого кода (уже есть, но добавим возврат кода)
app.post('/api/guest-codes', async (req, res) => {
    const { client_id, name, phone, email, duration, user_id } = req.body;
    const managerId = user_id || 1;
    try {
        await pool.query('BEGIN');
        let finalClientId = client_id;
        if (!client_id) {
            if (!name || !phone || !email) return res.status(400).json({ error: 'Необходимо заполнить данные клиента' });
            const existing = await pool.query('SELECT id FROM "Users" WHERE phone = $1', [phone]);
            if (existing.rows.length > 0) {
                finalClientId = existing.rows[0].id;
            } else {
                const seqRes = await pool.query(`SELECT nextval('users_id_seq') as next_id`);
                const nextId = seqRes.rows[0].next_id;
                await pool.query(`INSERT INTO trainers (id, specialization, bio, certificates, rating, is_available) VALUES ($1, NULL, NULL, NULL, NULL, false)`, [nextId]);
                await pool.query(`INSERT INTO "Users" (id, full_name, email, phone, password_hash, role_id, photo_url, is_active, created_at) VALUES ($1, $2, $3, $4, '123', 3, NULL, true, NOW())`, [nextId, name, email, phone]);
                finalClientId = nextId;
            }
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + duration);
        const result = await pool.query(
            `INSERT INTO temporary_codes (code, client_id, type, valid_from, valid_until, max_uses, used_count, created_by, created_at)
             VALUES ($1, $2, 'guest', NOW(), $3, 1, 0, $4, NOW()) RETURNING id`,
            [code, finalClientId, validUntil, managerId]
        );
        await pool.query('COMMIT');
        await logAction(managerId, 'Генерация гостевого кода', 'temporary_code', result.rows[0].id, null, { client_id: finalClientId, duration, code }, req);
        res.json({ code, clientId: finalClientId, valid_until: validUntil });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.post('/api/specializations', async (req, res) => {
    const { name, description, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const result = await pool.query(
            `INSERT INTO specializations (name, description) VALUES ($1, $2) RETURNING id`,
            [name, description]
        );
        const newId = result.rows[0].id;
        await logAction(userId, 'Создание специализации', 'specialization', newId, null, req.body, req);
        res.json({ id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/specializations/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, user_id } = req.body;
    const userId = user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM specializations WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Специализация не найдена' });
        await pool.query(
            `UPDATE specializations SET name = $1, description = $2 WHERE id = $3`,
            [name, description, id]
        );
        await logAction(userId, 'Обновление специализации', 'specialization', id, old.rows[0], req.body, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/specializations/:id', async (req, res) => {
    const id = req.params.id;
    const userId = req.body.user_id || 1;
    try {
        const old = await pool.query('SELECT * FROM specializations WHERE id = $1', [id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Специализация не найдена' });
        const used = await pool.query('SELECT trainer_id FROM trainer_specializations WHERE specialization_id = $1', [id]);
        if (used.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete specialization assigned to trainers' });
        }
        await pool.query('DELETE FROM specializations WHERE id = $1', [id]);
        await logAction(userId, 'Удаление специализации', 'specialization', id, old.rows[0], null, req);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/trainer/:id/specializations', async (req, res) => {
    const id = req.params.id;
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
    const id = req.params.id;
    const { specializationIds } = req.body;
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

app.post('/api/ratings', async (req, res) => {
    const { client_id, trainer_id, rating, user_id } = req.body;
    const userId = user_id || client_id;
    try {
        await pool.query('BEGIN');
        const oldRating = await pool.query(`SELECT rating FROM client_trainer_ratings WHERE client_id = $1 AND trainer_id = $2`, [client_id, trainer_id]);
        await pool.query(
            `INSERT INTO client_trainer_ratings (client_id, trainer_id, rating, updated_at) VALUES ($1, $2, $3, NOW())
             ON CONFLICT (client_id, trainer_id) DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
            [client_id, trainer_id, rating]
        );
        const avgRes = await pool.query(`SELECT AVG(rating)::numeric(10,2) as avg_rating FROM client_trainer_ratings WHERE trainer_id = $1`, [trainer_id]);
        const avgRating = avgRes.rows[0].avg_rating;
        await pool.query(`UPDATE trainers SET rating = $1 WHERE id = $2`, [avgRating, trainer_id]);
        await pool.query('COMMIT');
        const oldData = oldRating.rows[0] ? { rating: oldRating.rows[0].rating } : null;
        await logAction(userId, 'Оценка тренера', 'rating', trainer_id, oldData, { rating, new_avg: avgRating }, req);
        res.json({ success: true, new_avg: avgRating });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/user/:id', async (req, res) => {
    const userId = req.params.id;
    const { full_name, email, phone, photo_url, currentPassword, newPassword } = req.body;
    const loggedUserId = req.body.logged_user_id || userId; // кто выполняет действие
    try {
        const userRes = await pool.query('SELECT * FROM "Users" WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        const oldData = userRes.rows[0];
        const currentHash = oldData.password_hash;
        if (newPassword && currentPassword !== currentHash) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }
        if (email) {
            const emailCheck = await pool.query('SELECT id FROM "Users" WHERE email = $1 AND id != $2', [email, userId]);
            if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        if (phone) {
            const phoneCheck = await pool.query('SELECT id FROM "Users" WHERE phone = $1 AND id != $2', [phone, userId]);
            if (phoneCheck.rows.length > 0) return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
        }
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (full_name) { updates.push(`full_name = $${paramIndex++}`); values.push(full_name); }
        if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }
        if (phone) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
        if (photo_url !== undefined) { updates.push(`photo_url = $${paramIndex++}`); values.push(photo_url || null); }
        if (newPassword) { updates.push(`password_hash = $${paramIndex++}`); values.push(newPassword); }
        if (updates.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });
        values.push(userId);
        const query = `UPDATE "Users" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, full_name, email, phone, photo_url`;
        const result = await pool.query(query, values);
        await logAction(loggedUserId, 'Обновление профиля', 'user', userId, oldData, result.rows[0], req);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Для корневого пути – отдаём index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Перенаправление /profile -> /profile.html и т.д. (для удобства)
app.get('/profile', (req, res) => res.redirect('/profile.html'));
app.get('/login', (req, res) => res.redirect('/login.html'));
app.get('/cart', (req, res) => res.redirect('/cart.html'));
app.get('/products', (req, res) => res.redirect('/products.html'));
app.get('/services', (req, res) => res.redirect('/services.html'));
app.get('/trainers', (req, res) => res.redirect('/trainers.html'));
app.get('/schedule', (req, res) => res.redirect('/schedule.html'));

// Важно: эти маршруты должны быть ПОСЛЕ всех API-маршрутов, чтобы не перехватывать /api/*


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});