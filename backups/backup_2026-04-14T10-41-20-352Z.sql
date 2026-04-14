--
-- PostgreSQL database dump
--

\restrict JzideHQhgaareaWxNz5gOLMh2kLXaomN1N0RlL6fsgwbJqlzN4cTJa0PNHVgGoU

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    id integer DEFAULT nextval('public.users_id_seq'::regclass) NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    password_hash text NOT NULL,
    role_id integer NOT NULL,
    photo_url text,
    is_active boolean,
    last_login timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- Name: access_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_logs (
    id bigint NOT NULL,
    client_id integer,
    entry_time timestamp with time zone NOT NULL,
    method text,
    success boolean,
    code_used text,
    sync_time timestamp with time zone
);


ALTER TABLE public.access_logs OWNER TO postgres;

--
-- Name: access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.access_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.access_logs_id_seq OWNER TO postgres;

--
-- Name: access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.access_logs_id_seq OWNED BY public.access_logs.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    user_id integer,
    action text NOT NULL,
    entity_type text,
    entity_id integer,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO postgres;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id integer DEFAULT nextval('public.bookings_id_seq'::regclass) NOT NULL,
    client_id integer NOT NULL,
    session_id integer NOT NULL,
    status text,
    booking_time timestamp with time zone,
    cancelled_at timestamp with time zone,
    source text,
    note text
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: client_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_subscriptions_id_seq OWNER TO postgres;

--
-- Name: client_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_subscriptions (
    id integer DEFAULT nextval('public.client_subscriptions_id_seq'::regclass) NOT NULL,
    client_id integer NOT NULL,
    tier_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text,
    auto_renew boolean,
    price_paid numeric,
    payment_id integer,
    created_at timestamp with time zone
);


ALTER TABLE public.client_subscriptions OWNER TO postgres;

--
-- Name: client_trainer_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_trainer_ratings (
    client_id integer NOT NULL,
    trainer_id integer NOT NULL,
    rating integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT client_trainer_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.client_trainer_ratings OWNER TO postgres;

--
-- Name: group_training_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_training_types (
    id integer NOT NULL,
    trainer_id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.group_training_types OWNER TO postgres;

--
-- Name: group_training_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.group_training_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_training_types_id_seq OWNER TO postgres;

--
-- Name: group_training_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.group_training_types_id_seq OWNED BY public.group_training_types.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    type text,
    channel text,
    subject text,
    content text,
    status text,
    sent_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer DEFAULT nextval('public.orders_id_seq'::regclass) NOT NULL,
    client_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    total_price numeric NOT NULL,
    status text,
    access_code text,
    payment_id integer,
    issued_at timestamp with time zone,
    created_at timestamp with time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: payment_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_items (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    item_type text,
    item_id integer NOT NULL,
    amount numeric
);


ALTER TABLE public.payment_items OWNER TO postgres;

--
-- Name: payment_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_items_id_seq OWNER TO postgres;

--
-- Name: payment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_items_id_seq OWNED BY public.payment_items.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    amount numeric NOT NULL,
    currency text,
    payment_method text,
    status text,
    external_id text,
    description text,
    payment_time timestamp with time zone,
    created_at timestamp with time zone
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer DEFAULT nextval('public.products_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    unit text,
    stock_quantity integer NOT NULL,
    min_stock integer,
    is_active boolean,
    image_url text,
    created_at timestamp with time zone,
    category text
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer DEFAULT nextval('public.roles_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    description text,
    permissions jsonb
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: specializations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specializations (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.specializations OWNER TO postgres;

--
-- Name: specializations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specializations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specializations_id_seq OWNER TO postgres;

--
-- Name: specializations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specializations_id_seq OWNED BY public.specializations.id;


--
-- Name: subscription_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_tiers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_tiers_id_seq OWNER TO postgres;

--
-- Name: subscription_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_tiers (
    id integer DEFAULT nextval('public.subscription_tiers_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    description text,
    duration_dayss integer NOT NULL,
    price numeric NOT NULL,
    access_type text,
    is_active boolean,
    created_at timestamp with time zone
);


ALTER TABLE public.subscription_tiers OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: temporary_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.temporary_codes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.temporary_codes_id_seq OWNER TO postgres;

--
-- Name: temporary_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.temporary_codes (
    id integer DEFAULT nextval('public.temporary_codes_id_seq'::regclass) NOT NULL,
    code text NOT NULL,
    client_id integer,
    type text NOT NULL,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone NOT NULL,
    max_uses integer,
    used_count integer,
    created_by integer,
    created_at timestamp with time zone
);


ALTER TABLE public.temporary_codes OWNER TO postgres;

--
-- Name: trainer_client_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trainer_client_notes (
    trainer_id integer NOT NULL,
    client_id integer NOT NULL,
    note text
);


ALTER TABLE public.trainer_client_notes OWNER TO postgres;

--
-- Name: trainer_specializations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trainer_specializations (
    trainer_id integer NOT NULL,
    specialization_id integer NOT NULL
);


ALTER TABLE public.trainer_specializations OWNER TO postgres;

--
-- Name: trainers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trainers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trainers_id_seq OWNER TO postgres;

--
-- Name: trainers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trainers (
    id integer DEFAULT nextval('public.trainers_id_seq'::regclass) NOT NULL,
    specialization text,
    bio text,
    certificates jsonb,
    rating numeric,
    is_available boolean,
    hourly_rate integer
);


ALTER TABLE public.trainers OWNER TO postgres;

--
-- Name: training_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.training_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.training_sessions_id_seq OWNER TO postgres;

--
-- Name: training_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.training_sessions (
    id integer DEFAULT nextval('public.training_sessions_id_seq'::regclass) NOT NULL,
    type text NOT NULL,
    trainer_id integer NOT NULL,
    name text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    max_participants integer,
    room text,
    status text,
    created_at timestamp with time zone,
    group_type_id integer,
    price integer
);


ALTER TABLE public.training_sessions OWNER TO postgres;

--
-- Name: access_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs ALTER COLUMN id SET DEFAULT nextval('public.access_logs_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: group_training_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_training_types ALTER COLUMN id SET DEFAULT nextval('public.group_training_types_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payment_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items ALTER COLUMN id SET DEFAULT nextval('public.payment_items_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: specializations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations ALTER COLUMN id SET DEFAULT nextval('public.specializations_id_seq'::regclass);


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (id, full_name, phone, email, password_hash, role_id, photo_url, is_active, last_login, created_at, updated_at) FROM stdin;
3	Дмитрий Козлов	+79163334455	dmitry.k@example.com	123	2	/photos/trainer2.jpg	t	2025-03-09 23:15:00+08	2022-06-20 16:00:00+08	2025-03-09 23:15:00+08
6	Ольга Морозова	+79166667788	olga.m@example.com	123	3	/photos/client3.jpg	t	2025-03-09 17:10:00+08	2024-03-10 14:00:00+08	2025-03-09 17:10:00+08
7	Алексей Соколов	+79167778899	alexey.s@example.com	123	4	/photos/manager1.jpg	t	2025-03-10 13:00:00+08	2023-09-01 15:00:00+08	2025-03-10 13:00:00+08
15	Колбасенко Даниил Даниленко	+790877654523	kolbasenko.d@example.com	123	3	\N	t	\N	2026-03-15 23:37:16.218864+08	\N
4	Новикова Елена Афанасьевна	79164445566	elena.n@example.com	123	3	/photos/client1.jpg	t	2025-03-10 14:45:00+08	2024-01-15 19:30:00+08	2025-03-10 14:45:00+08
20	Куликовская Алена Александровна	77846638847	kulikova.a@example.com	123	3	\N	t	\N	2026-03-16 20:15:35.988603+08	\N
21	Хандраков Артем Иванович	79848883747	handrakov.a@example.com	123	3	\N	t	\N	2026-03-16 20:20:52.369799+08	\N
19	Карпов Олег Игнатьевич	79876654577	karpov.o@example.com	123	3	\N	t	\N	2026-03-16 20:13:49.494724+08	\N
5	Иванов Сергей	79165556677	sergey.i@example.com	123	3	\N	t	2025-03-09 01:00:00+08	2024-02-20 21:00:00+08	2025-03-09 01:00:00+08
2	Анна Смирнова	79162223344	anna.s@example.com	123	2	https://img.freepik.com/premium-photo/african-american-girl-fitness-trainer-with-dumbbells-doing-exercises_152625-1169.jpg	t	2025-03-10 13:30:00+08	2022-05-10 15:00:00+08	2025-03-10 13:30:00+08
16	Долгова Анна Ивановна	79276648392	dolgova.a@example.com	123	3	\N	t	\N	2026-03-15 23:39:34.52392+08	\N
14	Пендюра Иван Иоанович	79756666777	pendura.i@example.com	123	3	\N	t	\N	2026-03-15 23:34:12.400099+08	\N
18	Прокопов Игнат Игнатьевич	79768837593	prokop.i@example.com	123	3	\N	t	\N	2026-03-16 19:32:01.417743+08	\N
1	Иван Петров	79161112233	ivan.p@example.com	123	1	/photos/admin1.jpg	t	2026-04-14 11:31:11.903559+08	2023-01-01 14:00:00+08	2025-03-09 15:00:00+08
\.


--
-- Data for Name: access_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.access_logs (id, client_id, entry_time, method, success, code_used, sync_time) FROM stdin;
1	4	2025-03-10 13:30:00+08	карта	t	CARD001	2025-03-10 13:31:00+08
2	5	2025-03-09 22:00:00+08	код	t	DAYACCESS	2025-03-09 22:02:00+08
3	6	2025-03-10 15:15:00+08	карта	t	CARD003	2025-03-10 15:16:00+08
4	2	2025-03-10 13:00:00+08	биометрия	t	\N	2025-03-10 13:01:00+08
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
1	1	ОБНОВЛЕНИЕ	user	4	{"phone": "+79164445566"}	{"phone": "+79164445577"}	192.168.1.10	Mozilla/5.0	2025-03-09 19:30:00+08
2	2	СОЗДАНИЕ	training_session	4	\N	{"name": "Персональная тренировка"}	192.168.1.22	Admin Panel	2025-03-10 17:00:00+08
3	1	Обновление услуги	subscription_tier	5	{"id": 5, "name": "Улучшенный", "price": "4500", "is_active": false, "created_at": "2026-03-10T12:56:07.269Z", "access_type": "только зал", "description": "Тенажерный зал с 2 личными занятиями с тренером", "duration_dayss": 45}	{"name": "Улучшенный", "price": 4500, "access": "только зал", "duration": 45, "is_active": true, "description": "Тенажерный зал с 2 личными занятиями с тренером"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-14 10:48:46.038299+08
4	1	Вход в систему	auth	1	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-14 11:31:11.907916+08
5	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-02-18-555Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:02:18.791962+08
6	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-02-30-951Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:02:31.225581+08
7	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-04-40-589Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:04:40.870656+08
8	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-08-23-272Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:08:23.549034+08
9	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-08-34-537Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:08:34.735613+08
10	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-20-40-143Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:20:40.24682+08
11	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-20-43-860Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:20:43.913767+08
12	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-20-46-941Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:20:46.982406+08
13	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-25-45-046Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:25:45.12488+08
14	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-25-48-563Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:25:48.602838+08
15	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-27-55-242Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:27:55.311762+08
16	1	Создание резервной копии	backup	\N	\N	{"filename": "backup_2026-04-14T10-27-58-252Z.sql"}	::1	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	2026-04-14 18:27:58.282935+08
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, client_id, session_id, status, booking_time, cancelled_at, source, note) FROM stdin;
29	4	31	отменено	2026-03-14 20:03:24.614941+08	\N	корзина	\N
34	6	55	отменено	2026-03-15 17:52:15.3178+08	2026-03-15 18:59:09.123476+08	корзина	\N
35	6	55	отменено	2026-03-15 18:59:17.032611+08	2026-03-15 20:05:04.956102+08	корзина	\N
33	6	73	отменено	2026-03-15 17:52:15.275223+08	2026-03-15 20:05:11.688601+08	корзина	\N
39	6	56	подтверждено	2026-03-15 20:26:49.556291+08	\N	корзина	\N
40	4	55	отменено	2026-03-15 21:14:59.878851+08	2026-03-15 21:15:15.011281+08	корзина	\N
37	6	55	отменено	2026-03-15 20:05:31.23785+08	\N	корзина	\N
41	4	55	отменено	2026-03-15 21:15:23.873149+08	\N	корзина	\N
43	4	77	подтверждено	2026-03-15 22:07:08.532791+08	\N	корзина	\N
42	4	55	отменено	2026-03-15 21:42:29.926471+08	2026-03-16 00:37:41.576524+08	корзина	\N
44	4	67	отменено	2026-03-16 00:08:43.695002+08	2026-03-16 00:40:44.946439+08	корзина	\N
45	4	76	отменено	2026-03-16 00:08:43.749401+08	2026-03-16 00:41:20.059234+08	корзина	\N
46	4	76	подтверждено	2026-03-16 16:06:30.795516+08	\N	корзина	\N
47	4	72	подтверждено	2026-03-16 16:06:30.858381+08	\N	корзина	\N
50	6	62	подтверждено	2026-03-16 18:08:11.207875+08	\N	корзина	\N
51	19	69	подтверждено	2026-03-16 20:50:47.183467+08	\N	корзина	\N
52	6	71	отменено	2026-03-17 09:29:19.421668+08	2026-03-17 09:30:09.069405+08	корзина	\N
48	6	76	отменено	2026-03-16 18:08:11.181388+08	2026-03-17 09:38:06.837071+08	корзина	\N
49	6	61	отменено	2026-03-16 18:08:11.192196+08	\N	корзина	\N
53	6	73	подтверждено	2026-03-17 09:40:43.552085+08	\N	корзина	\N
54	4	71	подтверждено	2026-03-17 19:01:19.335949+08	\N	корзина	\N
55	4	81	подтверждено	2026-03-24 16:14:38.111093+08	\N	корзина	\N
56	4	83	подтверждено	2026-03-24 16:14:38.134697+08	\N	корзина	\N
57	4	89	подтверждено	2026-04-07 10:26:07.115892+08	\N	корзина	\N
58	4	102	подтверждено	2026-04-12 15:28:11.80516+08	\N	корзина	\N
59	4	100	подтверждено	2026-04-12 15:28:11.818855+08	\N	корзина	\N
\.


--
-- Data for Name: client_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_subscriptions (id, client_id, tier_id, start_date, end_date, status, auto_renew, price_paid, payment_id, created_at) FROM stdin;
1	4	2	2025-02-01	2025-03-01	закончился	t	5500.00	\N	2025-02-01 15:00:00+08
2	4	2	2025-03-01	2025-04-01	активен	t	5500.00	1	2025-03-01 14:30:00+08
3	5	1	2025-03-05	2025-04-05	активен	t	3500.00	2	2025-03-05 19:15:00+08
4	6	3	2025-01-10	2026-01-10	активен	f	35000.00	3	2025-01-10 16:45:00+08
5	4	5	2026-03-13	2026-04-27	активен	f	4500	\N	2026-03-13 16:53:43.749092+08
6	6	3	2026-03-15	2027-03-15	активен	f	35000.00	\N	2026-03-15 18:58:05.924748+08
7	15	2	2026-03-16	2026-04-15	активен	f	5500.00	\N	2026-03-16 17:41:17.011364+08
8	20	4	2026-03-16	2026-03-17	активен	f	800.00	\N	2026-03-16 20:19:08.677296+08
\.


--
-- Data for Name: client_trainer_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_trainer_ratings (client_id, trainer_id, rating, created_at, updated_at) FROM stdin;
6	2	5	2026-03-16 17:35:51.032313+08	2026-03-16 18:41:27.676108+08
6	3	1	2026-03-16 17:13:10.441728+08	2026-03-17 09:38:25.648853+08
4	2	5	2026-04-12 15:28:56.044603+08	2026-04-12 15:28:56.044603+08
4	3	3	2026-04-12 15:28:57.742779+08	2026-04-12 15:29:25.257016+08
\.


--
-- Data for Name: group_training_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_training_types (id, trainer_id, name, description, created_at) FROM stdin;
1	2	Здоровая спина	Тренеровкан направленная на проработку мышц спины. Подходит для начинающих.	2026-03-14 21:37:12.519495+08
2	2	CrossFit	Активная тренеровка для проработки всего тела.	2026-03-14 21:38:44.852237+08
4	3	Йога	Мягкая растяжка для тела и разума	2026-03-14 23:13:40.612848+08
5	2	Пилатес	Комплекс физических упражнений, направленный на укрепление мышечного корсета, развитие гибкости, улучшение координации движений, исправление осанки	2026-04-07 10:38:22.58725+08
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, channel, subject, content, status, sent_at) FROM stdin;
1	4	email	email	Подтверждение бронирования	Вы успешно забронировали занятие "Утренняя йога" на 11 марта	отправлено	2025-03-09 16:23:00+08
2	5	sms	sms	Напоминание о занятии	Завтра в 18:00 CrossFit. Ждем вас!	отправлено	2025-03-10 23:00:00+08
3	6	push	push	Новое занятие	Запись на растяжку открыта	ожидает	\N
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, client_id, product_id, quantity, total_price, status, access_code, payment_id, issued_at, created_at) FROM stdin;
1	4	1	1	250.00	завершён	ACC123	4	2025-03-10 17:30:00+08	2025-03-10 17:25:00+08
2	5	2	2	160.00	завершён	\N	5	2025-03-09 22:45:00+08	2025-03-09 22:40:00+08
3	5	4	3	450.00	завершён	\N	5	2025-03-09 22:45:00+08	2025-03-09 22:40:00+08
4	4	2	1	80	оплачен	971737	6	\N	2026-03-13 15:56:48.012988+08
5	4	3	1	1200	оплачен	673617	6	\N	2026-03-13 15:56:48.012988+08
6	4	4	1	150	оплачен	700232	7	\N	2026-03-13 16:22:08.486999+08
7	4	5	1	150	оплачен	660336	7	\N	2026-03-13 16:22:08.486999+08
8	4	2	1	80	оплачен	193382	8	\N	2026-03-13 16:34:37.465942+08
9	4	1	1	250	оплачен	185496	9	\N	2026-03-13 16:53:43.768138+08
10	4	5	1	150	оплачен	810101	10	\N	2026-03-13 22:23:51.161159+08
11	4	1	2	500	оплачен	160513	10	\N	2026-03-13 22:23:51.161159+08
12	6	3	3	3600	оплачен	451961	11	\N	2026-03-15 19:18:23.280301+08
13	6	1	1	250	оплачен	640423	11	\N	2026-03-15 19:18:23.280301+08
14	6	4	2	300	оплачен	462501	11	\N	2026-03-15 19:18:23.280301+08
15	6	5	1	150	оплачен	929805	11	\N	2026-03-15 19:18:23.280301+08
16	6	3	2	2400	оплачен	424695	12	\N	2026-03-15 19:47:55.852624+08
17	6	1	2	500	оплачен	373640	12	\N	2026-03-15 19:47:55.852624+08
18	6	1	1	250	оплачен	745696	13	\N	2026-03-17 09:29:19.390698+08
19	6	3	13	15600	оплачен	562126	14	\N	2026-03-17 09:40:43.524897+08
20	6	4	7	1050	оплачен	999612	14	\N	2026-03-17 09:40:43.524897+08
21	6	5	11	1650	оплачен	190652	14	\N	2026-03-17 09:40:43.524897+08
22	6	6	7	700	оплачен	781613	14	\N	2026-03-17 09:40:43.524897+08
23	6	1	1	250	оплачен	851713	14	\N	2026-03-17 09:40:43.524897+08
24	6	2	1	80	оплачен	942754	14	\N	2026-03-17 09:40:43.524897+08
25	4	5	1	150	оплачен	819326	15	\N	2026-03-17 19:01:19.318722+08
26	4	5	1	95	оплачен	713192	16	\N	2026-04-12 15:28:11.762853+08
\.


--
-- Data for Name: payment_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_items (id, payment_id, item_type, item_id, amount) FROM stdin;
1	1	подписка	2	5500.00
2	2	подписка	3	3500.00
3	3	подписка	4	35000.00
4	4	заказ	1	250.00
5	5	заказ	2	160.00
6	5	заказ	3	450.00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, client_id, amount, currency, payment_method, status, external_id, description, payment_time, created_at) FROM stdin;
1	4	5500.00	руб	банковская карта	проведён	ext_12345	Оплата подписки Премиум	2025-03-01 14:35:00+08	2025-03-01 14:30:00+08
2	5	3500.00	руб	наличные	проведён	\N	Оплата подписки Базовый	2025-03-05 19:20:00+08	2025-03-05 19:15:00+08
3	6	35000.00	руб	банковская карта	проведён	ext_67890	Оплата годовой подписки	2025-01-10 16:50:00+08	2025-01-10 16:45:00+08
4	4	250.00	руб	банковская карта	проведён	ext_54321	Покупка протеинового коктейля	2025-03-10 17:30:00+08	2025-03-10 17:25:00+08
5	5	960.00	руб	банковская карта	проведён	ext_98765	Покупка воды и батончика	2025-03-09 22:45:00+08	2025-03-09 22:40:00+08
6	4	1280	руб	онлайн	проведён	\N	\N	\N	2026-03-13 15:56:48.012988+08
7	4	300	руб	онлайн	проведён	\N	\N	\N	2026-03-13 16:22:08.486999+08
8	4	80	руб	онлайн	проведён	\N	\N	\N	2026-03-13 16:34:37.465942+08
9	4	250	руб	онлайн	проведён	\N	\N	\N	2026-03-13 16:53:43.768138+08
10	4	650	руб	онлайн	проведён	\N	\N	\N	2026-03-13 22:23:51.161159+08
11	6	4300	руб	онлайн	проведён	\N	\N	\N	2026-03-15 19:18:23.280301+08
12	6	2900	руб	онлайн	проведён	\N	\N	\N	2026-03-15 19:47:55.852624+08
13	6	250	руб	онлайн	проведён	\N	\N	\N	2026-03-17 09:29:19.390698+08
14	6	19330	руб	онлайн	проведён	\N	\N	\N	2026-03-17 09:40:43.524897+08
15	4	150	руб	онлайн	проведён	\N	\N	\N	2026-03-17 19:01:19.318722+08
16	4	95	руб	онлайн	проведён	\N	\N	\N	2026-04-12 15:28:11.762853+08
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, price, unit, stock_quantity, min_stock, is_active, image_url, created_at, category) FROM stdin;
6	Вода со вкусом клубники	Бутилированная вода со вкусом клубники 0,5 л.	100	шт	18	\N	t	https://storage.googleapis.com/images-bks-prd-1385851.bks.prd.v8.commerce.mi9cloud.com/product-images/detail/00858176002065_C7N1.jpeg	2026-03-16 21:04:44.988924+08	Вода
7	что-то	где-то	100	шт	10	\N	f		2026-04-07 10:50:38.945741+08	Коктейл
8	что-то	где-то	100	шт	10	\N	f		2026-04-07 11:19:18.223673+08	
5	Газированная вода	Газированная бутилированная вода 0,5 л.	95	шт	49	\N	t	https://kachestvorb.ru/upload/iblock/370/88xhpbuvtfo98bzp8lsaxp46eah58pen.png	2026-03-10 21:49:26.162232+08	Вода
9	роба	роба простая	1500	шт	10	\N	f		2026-04-12 16:30:06.099485+08	Одежда
10	оло	оло	90	шт	10	\N	f		2026-04-13 18:50:33.972818+08	
4	Энергетический батончик	Протеиновый	150	шт	90	20	t	/images/bar.jpg	2024-01-01 17:00:00+08	Батончики
1	Протеиновый коктейль	Шоколадный вкус, 500 мл	250	шт	42	10	t	/images/protein_shake.jpg	2024-01-01 17:00:00+08	Коктейл
2	Бутилированная вода	0.5 л без газа	80	шт	197	50	t	/images/water.jpg	2024-01-01 17:00:00+08	Вода
3	Футболка с логотипом X-Men	Черная, размер M	1200	шт	20	5	t	/images/tshirt.jpg	2024-02-01 15:00:00+08	Одежда
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, permissions) FROM stdin;
1	Администратор	Полный доступ к системе	{"all": true}
2	Тренер	Просмотр расписания, редактирование своих тренировок	{"view_schedule": true, "edit_own_sessions": true}
3	Клиент	Бронирование занятий, просмотр своих абонементов	{"book_sessions": true, "view_own_subscriptions": true}
4	Менеджер	Управление клиентами и товарами	{"manage_clients": true, "manage_products": true}
\.


--
-- Data for Name: specializations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.specializations (id, name, description, created_at) FROM stdin;
1	Песрональный тренинг	Качественная персональная тренеровка с гарантированными результатами.	2026-03-14 22:30:16.681233+08
2	CrossFit	Функциональные и активные тренеровки для всего тела.	2026-03-14 22:31:34.153721+08
3	Йога	Мягкая растяжка для тела, чтобы улучшить свое физическое и ментальное состояние.	2026-03-14 22:32:06.773085+08
4	Стретчинг	Растяжка мышц, повышение гибкости тела и развитие подвижности суставов.	2026-03-14 22:33:18.567741+08
5	Функциональный тренинг	Физические упражнения, направленные на развитие основных качеств (сила, выносливость, координация, гибкость) через движения, имитирующие повседневную активность.	2026-03-14 22:34:15.125786+08
\.


--
-- Data for Name: subscription_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_tiers (id, name, description, duration_dayss, price, access_type, is_active, created_at) FROM stdin;
3	Годовой	Безлимитный доступ на 365 дней	365	35000.00	полный доступ	t	2023-01-01 05:00:00+08
4	Разовое занятие	Однократное посещение	1	800.00	только зал	t	2023-01-01 05:00:00+08
1	Базовый	Доступ в тренажерный зал в часы работы клуба	30	3500	только зал	t	2023-01-01 05:00:00+08
2	Премиум	Тренажерный зал + групповые занятия	30	5500	полный доступ	t	2023-01-01 05:00:00+08
6	ололошг	трнлдддл+лпае	90	6789	полный доступ	f	2026-04-12 16:30:46.779521+08
5	Улучшенный	Тенажерный зал с 2 личными занятиями с тренером	45	4500	только зал	t	2026-03-10 20:56:07.269113+08
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (key, value, description, updated_at) FROM stdin;
contact_phone	"+7 (3952) 123-456"	Телефон для подвала	2026-04-13 19:31:57.889982+08
contact_email	"info@xmen.fit"	Email для подвала	2026-04-13 19:32:16.542675+08
club_work_hours	"Круглосуточно"	Часы работы фитнес-клуба	2026-04-13 19:32:55.118506+08
support_work_hours	"Пн–Пт: 9:00–21:00 \\nСб–Вс: 10:00–18:00"	Часы работы поддержки и менеджеров	2026-04-13 19:33:41.144606+08
contact_address	"г. Иркутск, ул. Спортивная, 1"	Адрес для подвала	2026-04-13 19:34:06.841474+08
\.


--
-- Data for Name: temporary_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.temporary_codes (id, code, client_id, type, valid_from, valid_until, max_uses, used_count, created_by, created_at) FROM stdin;
1	WELCOME10	4	скидка	2025-03-01 05:00:00+08	2025-04-01 05:00:00+08	1	0	1	2025-02-28 17:00:00+08
2	DAYACCESS	5	вход	2025-03-10 13:00:00+08	2025-03-11 04:59:00+08	1	0	1	2025-03-09 15:00:00+08
3	GUEST123	\N	гость	2025-03-11 05:00:00+08	2025-03-12 04:59:00+08	1	0	2	2025-03-10 14:00:00+08
4	112744	5	guest	2026-04-12 17:27:41.140684+08	2026-04-13 17:27:41.139+08	1	0	\N	2026-04-12 17:27:41.140684+08
5	892823	5	guest	2026-04-12 17:29:26.724526+08	2026-04-13 17:29:26.724+08	1	0	\N	2026-04-12 17:29:26.724526+08
6	229347	5	guest	2026-04-12 17:36:53.330025+08	2026-04-13 17:36:53.33+08	1	0	\N	2026-04-12 17:36:53.330025+08
7	539147	5	guest	2026-04-12 19:47:47.444581+08	2026-04-13 19:47:47.444+08	1	0	\N	2026-04-12 19:47:47.444581+08
8	154095	6	guest	2026-04-13 18:09:56.202856+08	2026-04-14 18:09:56.203+08	1	0	\N	2026-04-13 18:09:56.202856+08
\.


--
-- Data for Name: trainer_client_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trainer_client_notes (trainer_id, client_id, note) FROM stdin;
3	4	Новикова Еле
2	4	Дочь Димы, Грыжа S4-S5.\n
2	6	Ольга, все отлично
2	5	Заинтересован физ. показателями
\.


--
-- Data for Name: trainer_specializations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trainer_specializations (trainer_id, specialization_id) FROM stdin;
3	3
3	4
3	5
2	2
2	1
\.


--
-- Data for Name: trainers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trainers (id, specialization, bio, certificates, rating, is_available, hourly_rate) FROM stdin;
1	не применимо	\N	\N	\N	f	\N
4	не применимо	\N	\N	\N	f	\N
5	не применимо	\N	\N	\N	f	\N
6	не применимо	\N	\N	\N	f	\N
7	не применимо	\N	\N	\N	f	\N
3	Йога, стретчинг, функциональный тренинг.	Сертифицированный инструктор по йоге (RYT-200).	["yoga_alliance_789", "functional_training_101"]	2.00	t	\N
16	\N	\N	\N	\N	f	\N
14	\N	\N	\N	\N	f	\N
15	\N	\N	\N	\N	f	\N
18	\N	\N	\N	\N	f	\N
19	\N	\N	\N	\N	f	\N
20	\N	\N	\N	\N	f	\N
21	\N	\N	\N	\N	f	\N
2	Персональный тренинг, CrossFit	Опыт работы 8 лет. Мастер спорта по пауэрлифтингу.	["cert_crossfit_123", "cert_nasm_456"]	5.00	t	2000
\.


--
-- Data for Name: training_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.training_sessions (id, type, trainer_id, name, start_time, end_time, max_participants, room, status, created_at, group_type_id, price) FROM stdin;
28	персональная	2	Персональная тренировка	2026-03-14 15:00:00+08	2026-03-14 16:00:00+08	1	По договоренности	запланировано	2026-03-14 16:42:00.411163+08	\N	\N
29	персональная	2	Персональная тренировка	2026-03-14 17:00:00+08	2026-03-14 18:00:00+08	1	По договоренности	запланировано	2026-03-14 16:42:11.608603+08	\N	\N
31	персональная	2	Персональная тренировка	2026-03-15 08:00:00+08	2026-03-15 09:00:00+08	1	По договоренности	запланировано	2026-03-14 16:42:59.65168+08	\N	\N
32	персональная	2	Персональная тренировка	2026-03-15 10:00:00+08	2026-03-15 11:00:00+08	1	По договоренности	запланировано	2026-03-14 16:43:06.718477+08	\N	\N
36	персональная	2	Персональная тренировка	2026-03-16 08:00:00+08	2026-03-16 10:00:00+08	1	По договоренности	запланировано	2026-03-14 16:47:22.667015+08	\N	\N
37	персональная	2	Персональная тренировка	2026-03-16 10:00:00+08	2026-03-16 12:00:00+08	1	По договоренности	запланировано	2026-03-14 16:47:32.633801+08	\N	\N
40	персональная	2	Персональная тренировка	2026-03-14 14:00:00+08	2026-03-14 15:00:00+08	1	По договоренности	запланировано	2026-03-14 17:53:07.770545+08	\N	\N
52	персональная	2	Персональная тренировка	2026-03-14 20:00:00+08	2026-03-14 21:00:00+08	1	По договоренности	запланировано	2026-03-14 20:07:57.726704+08	\N	\N
55	групповая	2	Здоровая спина	2026-03-15 16:30:00+08	2026-03-15 17:30:00+08	10	Зал 1	запланировано	2026-03-14 21:38:07.070461+08	1	\N
60	персональная	2	Персональная тренировка	2026-03-16 18:00:00+08	2026-03-16 19:00:00+08	1	По договоренности	запланировано	2026-03-15 16:00:25.156929+08	\N	\N
61	персональная	2	Персональная тренировка	2026-03-18 07:00:00+08	2026-03-18 08:00:00+08	1	По договоренности	запланировано	2026-03-15 17:49:31.566355+08	\N	\N
62	персональная	2	Персональная тренировка	2026-03-18 08:00:00+08	2026-03-18 09:00:00+08	1	По договоренности	запланировано	2026-03-15 17:49:39.521401+08	\N	\N
63	персональная	2	Персональная тренировка	2026-03-18 09:00:00+08	2026-03-18 10:00:00+08	1	По договоренности	запланировано	2026-03-15 17:49:45.902669+08	\N	\N
64	персональная	2	Персональная тренировка	2026-03-18 10:00:00+08	2026-03-18 11:00:00+08	1	По договоренности	запланировано	2026-03-15 17:49:50.40238+08	\N	\N
65	персональная	2	Персональная тренировка	2026-03-18 11:00:00+08	2026-03-18 12:00:00+08	1	По договоренности	запланировано	2026-03-15 17:49:58.953684+08	\N	\N
66	персональная	2	Персональная тренировка	2026-03-18 12:00:00+08	2026-03-18 13:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:07.009521+08	\N	\N
67	персональная	2	Персональная тренировка	2026-03-18 13:00:00+08	2026-03-18 14:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:18.849143+08	\N	\N
68	персональная	2	Персональная тренировка	2026-03-19 14:00:00+08	2026-03-19 15:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:34.410936+08	\N	\N
69	персональная	2	Персональная тренировка	2026-03-19 15:00:00+08	2026-03-19 17:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:41.384548+08	\N	\N
70	персональная	2	Персональная тренировка	2026-03-19 17:00:00+08	2026-03-19 18:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:47.494974+08	\N	\N
71	персональная	2	Персональная тренировка	2026-03-19 18:00:00+08	2026-03-19 20:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:53.968963+08	\N	\N
72	персональная	2	Персональная тренировка	2026-03-19 20:00:00+08	2026-03-19 21:00:00+08	1	По договоренности	запланировано	2026-03-15 17:50:59.906202+08	\N	\N
73	персональная	2	Персональная тренировка	2026-03-19 21:00:00+08	2026-03-19 23:00:00+08	1	По договоренности	запланировано	2026-03-15 17:51:05.37578+08	\N	\N
83	персональная	2	Персональная тренировка	2026-03-26 09:00:00+08	2026-03-26 10:00:00+08	1	По договоренности	запланировано	2026-03-24 16:09:26.868046+08	\N	\N
56	групповая	2	CrossFit	2026-03-15 21:30:00+08	2026-03-15 23:00:00+08	17	Зал 2	запланировано	2026-03-14 21:39:24.324578+08	2	1000
84	персональная	2	Персональная тренировка	2026-03-26 11:00:00+08	2026-03-26 12:00:00+08	1	По договоренности	запланировано	2026-03-24 16:09:34.811415+08	\N	\N
76	групповая	2	CrossFit	2026-03-18 14:02:00+08	2026-03-18 15:02:00+08	10	Зал 1	запланировано	2026-03-15 22:03:08.202916+08	2	1700
78	групповая	2	CrossFit	2026-03-18 05:30:00+08	2026-03-18 06:30:00+08	10	Зал 1	запланировано	2026-03-16 00:30:50.539823+08	2	500
79	персональная	2	Персональная тренировка	2026-03-17 18:00:00+08	2026-03-17 19:00:00+08	1	По договоренности	запланировано	2026-03-17 09:33:55.010466+08	\N	\N
77	групповая	2	Здоровая спина	2026-03-17 14:03:00+08	2026-03-17 15:03:00+08	15	Зал 1	запланировано	2026-03-15 22:04:05.02313+08	1	500
85	персональная	2	Персональная тренировка	2026-03-26 13:00:00+08	2026-03-26 15:00:00+08	1	По договоренности	запланировано	2026-03-24 16:09:46.276628+08	\N	\N
89	персональная	3	Персональная тренировка	2026-04-08 10:00:00+08	2026-04-08 11:00:00+08	1	По договоренности	запланировано	2026-04-07 10:25:34.370368+08	\N	1500
80	групповая	2	Здоровая спина	2026-03-20 09:56:00+08	2026-03-20 10:56:00+08	10	Зал 1	запланировано	2026-03-17 17:56:12.132276+08	1	500
81	групповая	2	CrossFit	2026-03-26 16:00:00+08	2026-03-26 17:00:00+08	10	Зал 1	запланировано	2026-03-24 16:08:00.770255+08	2	500
82	персональная	2	Персональная тренировка	2026-03-26 08:00:00+08	2026-03-26 09:00:00+08	1	По договоренности	запланировано	2026-03-24 16:09:18.335083+08	\N	\N
86	персональная	2	Персональная тренировка	2026-03-26 17:00:00+08	2026-03-26 19:00:00+08	1	По договоренности	запланировано	2026-03-24 16:10:06.715914+08	\N	\N
87	групповая	2	Йога	2026-03-27 20:30:00+08	2026-03-27 21:30:00+08	7	Зал 1	запланировано	2026-03-24 16:24:22.60333+08	\N	2500
91	персональная	2	Персональная тренировка	2026-04-08 12:00:00+08	2026-04-08 13:00:00+08	1	По договоренности	запланировано	2026-04-07 11:37:18.85755+08	\N	\N
92	персональная	2	Персональная тренировка	2026-04-08 13:00:00+08	2026-04-08 14:00:00+08	1	По договоренности	запланировано	2026-04-07 11:37:26.316672+08	\N	\N
93	персональная	2	Персональная тренировка	2026-04-08 14:00:00+08	2026-04-08 16:00:00+08	1	По договоренности	запланировано	2026-04-07 11:37:33.837847+08	\N	\N
94	персональная	2	Персональная тренировка	2026-04-13 08:00:00+08	2026-04-13 09:00:00+08	1	По договоренности	запланировано	2026-04-12 15:20:05.946958+08	\N	\N
95	персональная	2	Персональная тренировка	2026-04-13 09:00:00+08	2026-04-13 10:00:00+08	1	По договоренности	запланировано	2026-04-12 15:20:12.183108+08	\N	\N
96	персональная	2	Персональная тренировка	2026-04-13 10:00:00+08	2026-04-13 11:00:00+08	1	По договоренности	запланировано	2026-04-12 15:21:21.306806+08	\N	\N
97	персональная	2	Персональная тренировка	2026-04-13 11:00:00+08	2026-04-13 13:00:00+08	1	По договоренности	запланировано	2026-04-12 15:21:28.582153+08	\N	\N
98	персональная	2	Персональная тренировка	2026-04-13 13:00:00+08	2026-04-13 15:00:00+08	1	По договоренности	запланировано	2026-04-12 15:21:37.197827+08	\N	\N
99	персональная	2	Персональная тренировка	2026-04-13 15:00:00+08	2026-04-13 16:30:00+08	1	По договоренности	запланировано	2026-04-12 15:21:50.351891+08	\N	\N
100	персональная	2	Персональная тренировка	2026-04-13 16:30:00+08	2026-04-13 18:00:00+08	1	По договоренности	запланировано	2026-04-12 15:22:30.041584+08	\N	\N
101	групповая	2	CrossFit	2026-04-15 15:24:00+08	2026-04-15 16:24:00+08	10	Зал 1	запланировано	2026-04-12 15:24:37.219051+08	2	500
102	групповая	2	Здоровая спина	2026-04-16 15:25:00+08	2026-04-16 16:25:00+08	10	Зал 1	запланировано	2026-04-12 15:25:41.804692+08	1	500
105	групповая	3	Йога	2026-04-13 16:01:00+08	2026-04-13 17:31:00+08	10	Зал 5	запланировано	2026-04-12 16:01:15.519004+08	4	1500
\.


--
-- Name: access_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.access_logs_id_seq', 4, true);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 16, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_id_seq', 59, true);


--
-- Name: client_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_subscriptions_id_seq', 8, true);


--
-- Name: group_training_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.group_training_types_id_seq', 5, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 26, true);


--
-- Name: payment_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_items_id_seq', 6, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 16, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 10, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- Name: specializations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.specializations_id_seq', 6, true);


--
-- Name: subscription_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_tiers_id_seq', 6, true);


--
-- Name: temporary_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.temporary_codes_id_seq', 8, true);


--
-- Name: trainers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trainers_id_seq', 7, true);


--
-- Name: training_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.training_sessions_id_seq', 105, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: client_subscriptions client_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: client_trainer_ratings client_trainer_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_trainer_ratings
    ADD CONSTRAINT client_trainer_ratings_pkey PRIMARY KEY (client_id, trainer_id);


--
-- Name: group_training_types group_training_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_training_types
    ADD CONSTRAINT group_training_types_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_items payment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: specializations specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_pkey PRIMARY KEY (id);


--
-- Name: subscription_tiers subscription_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: temporary_codes temporary_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_pkey PRIMARY KEY (id);


--
-- Name: trainer_client_notes trainer_client_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_client_notes
    ADD CONSTRAINT trainer_client_notes_pkey PRIMARY KEY (trainer_id, client_id);


--
-- Name: trainer_specializations trainer_specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_specializations
    ADD CONSTRAINT trainer_specializations_pkey PRIMARY KEY (trainer_id, specialization_id);


--
-- Name: trainers trainers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_pkey PRIMARY KEY (id);


--
-- Name: training_sessions training_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_pkey PRIMARY KEY (id);


--
-- Name: Users Users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_id_fkey" FOREIGN KEY (id) REFERENCES public.trainers(id) NOT VALID;


--
-- Name: Users Users_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_id_fkey1" FOREIGN KEY (id) REFERENCES public.trainers(id) NOT VALID;


--
-- Name: Users Users_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_id_fkey2" FOREIGN KEY (id) REFERENCES public.trainers(id) NOT VALID;


--
-- Name: Users Users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) NOT VALID;


--
-- Name: Users Users_role_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_role_id_fkey1" FOREIGN KEY (role_id) REFERENCES public.roles(id) NOT VALID;


--
-- Name: Users Users_role_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_role_id_fkey2" FOREIGN KEY (role_id) REFERENCES public.roles(id) NOT VALID;


--
-- Name: access_logs access_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: access_logs access_logs_client_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: access_logs access_logs_client_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_client_id_fkey2 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: audit_log audit_log_user_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: audit_log audit_log_user_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey2 FOREIGN KEY (user_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: bookings bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: bookings bookings_client_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: bookings bookings_client_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey2 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: bookings bookings_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.training_sessions(id) NOT VALID;


--
-- Name: bookings bookings_session_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_session_id_fkey1 FOREIGN KEY (session_id) REFERENCES public.training_sessions(id) NOT VALID;


--
-- Name: bookings bookings_session_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_session_id_fkey2 FOREIGN KEY (session_id) REFERENCES public.training_sessions(id) NOT VALID;


--
-- Name: client_subscriptions client_subscriptions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: client_subscriptions client_subscriptions_client_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: client_subscriptions client_subscriptions_client_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_client_id_fkey2 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: client_subscriptions client_subscriptions_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.subscription_tiers(id) NOT VALID;


--
-- Name: client_subscriptions client_subscriptions_tier_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_tier_id_fkey1 FOREIGN KEY (tier_id) REFERENCES public.subscription_tiers(id) NOT VALID;


--
-- Name: client_subscriptions client_subscriptions_tier_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_tier_id_fkey2 FOREIGN KEY (tier_id) REFERENCES public.subscription_tiers(id) NOT VALID;


--
-- Name: client_trainer_ratings client_trainer_ratings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_trainer_ratings
    ADD CONSTRAINT client_trainer_ratings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: client_trainer_ratings client_trainer_ratings_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_trainer_ratings
    ADD CONSTRAINT client_trainer_ratings_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: group_training_types group_training_types_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_training_types
    ADD CONSTRAINT group_training_types_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: notifications notifications_user_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: notifications notifications_user_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey2 FOREIGN KEY (user_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: orders orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: orders orders_client_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: orders orders_client_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey2 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;


--
-- Name: orders orders_product_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey1 FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;


--
-- Name: orders orders_product_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey2 FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;


--
-- Name: payment_items payment_items_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) NOT VALID;


--
-- Name: payment_items payment_items_payment_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_payment_id_fkey1 FOREIGN KEY (payment_id) REFERENCES public.payments(id) NOT VALID;


--
-- Name: payment_items payment_items_payment_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_payment_id_fkey2 FOREIGN KEY (payment_id) REFERENCES public.payments(id) NOT VALID;


--
-- Name: payments payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: payments payments_client_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: payments payments_client_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey2 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: temporary_codes temporary_codes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: temporary_codes temporary_codes_client_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: temporary_codes temporary_codes_client_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_client_id_fkey2 FOREIGN KEY (client_id) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: temporary_codes temporary_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: temporary_codes temporary_codes_created_by_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_created_by_fkey1 FOREIGN KEY (created_by) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: temporary_codes temporary_codes_created_by_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temporary_codes
    ADD CONSTRAINT temporary_codes_created_by_fkey2 FOREIGN KEY (created_by) REFERENCES public."Users"(id) NOT VALID;


--
-- Name: trainer_client_notes trainer_client_notes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_client_notes
    ADD CONSTRAINT trainer_client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public."Users"(id);


--
-- Name: trainer_client_notes trainer_client_notes_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_client_notes
    ADD CONSTRAINT trainer_client_notes_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id);


--
-- Name: trainer_specializations trainer_specializations_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_specializations
    ADD CONSTRAINT trainer_specializations_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE CASCADE;


--
-- Name: trainer_specializations trainer_specializations_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_specializations
    ADD CONSTRAINT trainer_specializations_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: training_sessions training_sessions_group_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_group_type_id_fkey FOREIGN KEY (group_type_id) REFERENCES public.group_training_types(id) ON DELETE SET NULL;


--
-- Name: training_sessions training_sessions_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) NOT VALID;


--
-- Name: training_sessions training_sessions_trainer_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_trainer_id_fkey1 FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) NOT VALID;


--
-- Name: training_sessions training_sessions_trainer_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_trainer_id_fkey2 FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) NOT VALID;


--
-- PostgreSQL database dump complete
--

\unrestrict JzideHQhgaareaWxNz5gOLMh2kLXaomN1N0RlL6fsgwbJqlzN4cTJa0PNHVgGoU

