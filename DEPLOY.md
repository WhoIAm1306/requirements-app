# Деплой приложения учёта предложений

Инструкция для развёртывания на **личном сервере** или на **VPS (например, Selectel)**. Минимальный вариант — **Docker Compose** (одна команда после настройки переменных).

---

## Что получится

- **Backend**: Go (Gin), порт по умолчанию `8080`.
- **Frontend**: собранный Vue SPA; в продакшене отдаётся **тем же процессом**, что и API: статика из каталога `frontend-dist`, маршруты `/api/*` — API (см. `backend/cmd/app/main.go`).
- **База**: PostgreSQL 16.

При доступе с одного хоста (например `http://IP:8080`) фронтенд обращается к API по пути **`/api`** — это соответствует `VITE_API_BASE_URL=/api` при сборке образа.

---

## Требования к серверу

| Ресурс | Минимум |
|--------|---------|
| ОС | Linux (Ubuntu 22.04/24.04, Debian 12 и т.п.) |
| RAM | от 1 ГБ (лучше 2 ГБ) |
| Диск | от 10 ГБ |
| Порты | открыть входящий **8080** (или 80/443 за reverse proxy) |

На **Selectel**: создайте облачный сервер (VPS), внешний IP, при необходимости добавьте правило файрвола для порта.

---

## Вариант 1: Docker Compose (рекомендуется)

### 1. Установите Docker

На Ubuntu:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Проверка: `docker compose version`.

### 2. Скопируйте проект на сервер

Например через `git clone` или `scp`/`rsync` всего репозитория.

### 3. Создайте файл `.env` в корне репозитория

```bash
cd /path/to/requirements-app-test
cp deploy.env.example .env
nano .env   # или vim
```

Обязательно задайте:

- **`DB_PASSWORD`** — пароль PostgreSQL внутри Docker.
- **`JWT_SECRET`** — длинная случайная строка (подпись JWT).
- **`SUPERUSER_PASSWORD`** — пароль первого администратора (создаётся при первом старте БД, если такого email ещё нет).
- **`FRONTEND_ORIGIN`** — полный URL, с которого пользователи открывают сайт в браузере, например `http://203.0.113.10:8080` или `https://cd.company.ru`. Нужен для **CORS** (иначе браузер может блокировать запросы к API).

Опционально: **`APP_PORT`** — если хотите пробросить не 8080, а, например, 80 (тогда в `.env` `APP_PORT=80` и откройте порт 80 в файрволе).

### 4. Запуск

```bash
docker compose build
docker compose up -d
```

Проверка API:

```bash
curl -s http://127.0.0.1:8080/api/health
```

Ожидается JSON с `"message":"ok"` (порт замените, если меняли `APP_PORT`).

Откройте в браузере: `http://<IP_сервера>:8080` (или ваш домен/порт).

**Вход**: email и пароль из `SUPERUSER_EMAIL` / `SUPERUSER_PASSWORD` в `.env`.

### 5. Данные и обновление

- Данные PostgreSQL хранятся в volume **`pgdata`**.
- Загруженные файлы ГК — в volume **`uploads`** (`/app/uploads` в контейнере).

**Обновление версии приложения:**

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

## Вариант 2: Без Docker (бинарник + PostgreSQL)

Подходит, если на сервере уже установлен PostgreSQL или политика запрещает контейнеры.

### 1. PostgreSQL

Создайте пользователя и базу (имена можно взять из `backend/.env.example`):

```sql
CREATE USER requirements_user WITH PASSWORD 'ваш_пароль';
CREATE DATABASE requirements_db OWNER requirements_user;
```

### 2. Backend

На машине с Go (или в CI) соберите бинарник:

```bash
cd backend
go build -o requirements-app ./cmd/app
```

На сервер положите: бинарник, каталог `backend` не нужен целиком — только бинарник и файл `.env`.

Скопируйте `backend/.env.example` → `backend/.env` (или положите `.env` рядом с бинарником при запуске из каталога `backend`), заполните `DB_*`, `JWT_SECRET`, `FRONTEND_ORIGIN`, суперпользователя.

### 3. Frontend

На машине с Node.js:

```bash
cd frontend
cp .env.production.example .env.production   # при необходимости поправьте VITE_API_BASE_URL
npm ci
npm run build
```

Скопируйте содержимое **`frontend/dist`** в каталог **`backend/frontend-dist`** рядом с бинарником (структура как после сборки: `frontend-dist/index.html`, `frontend-dist/assets/...`).

### 4. Запуск

Из каталога, где лежат бинарник и `frontend-dist`:

```bash
export $(grep -v '^#' .env | xargs)   # или используйте systemd EnvironmentFile
./requirements-app
```

Рабочий каталог важен: относительные пути `./uploads` и `./frontend-dist` (см. код приложения).

### 5. systemd (пример)

Файл `/etc/systemd/system/requirements-app.service`:

```ini
[Unit]
Description=Requirements app
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/requirements-app
EnvironmentFile=/opt/requirements-app/.env
ExecStart=/opt/requirements-app/requirements-app
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Затем: `sudo systemctl daemon-reload && sudo systemctl enable --now requirements-app`.

---

## HTTPS и домен (рекомендуется для продакшена)

Проще всего поставить **Nginx** как reverse proxy и **Certbot** (Let’s Encrypt):

- Nginx слушает **443**, проксирует на `http://127.0.0.1:8080`.
- В `.env` укажите **`FRONTEND_ORIGIN=https://ваш-домен.ru`**, перезапустите приложение.

Пример блока `server` для Nginx (после получения сертификата certbot подставит пути к `ssl_certificate`):

```nginx
server {
    listen 80;
    server_name requirements.company.ru;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Для Docker Compose достаточно оставить приложение на 8080 и поверх поставить Nginx на хосте, либо добавить второй сервис с Nginx в compose (по желанию).

---

## Резервное копирование

- **База**: `pg_dump` по расписанию (cron) в файл, хранить вне сервера.
- **Файлы**: каталог `uploads` (в Docker — volume `uploads`).

---

## Устранение неполадок

| Симптом | Что проверить |
|--------|----------------|
| Пустая страница, 404 на статику | Есть ли `frontend-dist/index.html` рядом с процессом, совпадает ли `WorkingDirectory`. |
| CORS / запросы к API не идут | `FRONTEND_ORIGIN` в `.env` должен **точно** совпадать с URL в адресной строке (схема, хост, порт). |
| Не подключается к БД в Docker | `DB_HOST=db`, пароль в `.env` совпадает с `POSTGRES_PASSWORD` в compose. |
| Порт занят | Смените `APP_PORT` в `.env` и в `docker compose` пробросе портов. |

---

## Краткий чеклист Selectel

1. Создать VPS, открыть порт 8080 (или 80/443).
2. Установить Docker + Compose.
3. Склонировать репозиторий, настроить `.env` из `deploy.env.example`.
4. `docker compose up -d`.
5. Проверить `http://<IP>:8080` и логин суперпользователя.
6. По желанию: домен, Nginx, HTTPS, смена паролей.
