# Git и GitHub: кратко и практически

Инструкция для разработчиков, кто хочет **выложить этот проект на GitHub** и понимать **базовые идеи Git**.

---

## Что такое Git и GitHub

- **Git** — программа на вашем компьютере. Она ведёт **историю изменений** (коммиты), ветки, слияния. Работает **локально**, интернет не обязателен.
- **GitHub** — сайт, где хранятся **удалённые** копии репозиториев. Удобно для бэкапа, совместной работы, CI, релизов.

**Репозиторий** — папка проекта, в которой Git отслеживает файлы (внутри есть скрытая папка `.git`).

---

## Основные понятия

| Термин | Смысл |
|--------|--------|
| **Коммит (commit)** | Снимок изменений с сообщением; «точка» в истории. |
| **Ветка (branch)** | Независимая линия коммитов. Обычно есть `main` (или `master`). |
| **Индекс / staging** | Область «что войдёт в следующий коммит». Сначала файлы добавляют в индекс, потом коммитят. |
| **remote** | Удалённый репозиторий (например, `origin` → URL на GitHub). |
| **push** | Отправить ваши коммиты на GitHub. |
| **pull** | Забрать изменения с GitHub и слить с локальной веткой. |
| **clone** | Склонировать чужой/свой репозиторий целиком на диск. |
| **.gitignore** | Список файлов и папок, которые Git **не** отслеживает (секреты, сборки, кэш). |

---

## Минимальный набор команд

```bash
git status              # что изменилось, что в индексе
git diff                # отличия в рабочей папке (не в индексе)
git add файл или .      # добавить в индекс (точка — всё подходящее)
git commit -m "Коротко: что сделано"
git log --oneline -10   # последние коммиты
git branch              # список веток
git switch имя-ветки    # переключиться на ветку (или создать: -c новая)
```

Работа с удалённым репозиторием:

```bash
git remote -v           # какие remote и их URL
git push origin main    # отправить ветку main на GitHub (имя remote часто origin)
git pull origin main    # забрать и слить main с GitHub
```

---

## Выложить этот проект на GitHub (пошагово)

### 1. Установите Git

- **Windows**: [git-scm.com](https://git-scm.com/download/win), после установки доступен `git` в терминале (PowerShell, Git Bash).
- Первый раз задайте имя и почту (будут видны в истории коммитов):

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "you@example.com"
```

### 2. Проверьте, что секреты не попадут в GitHub

**Не коммитьте:**

- `backend/.env` (пароли БД, JWT, суперпользователь).
- Любые ключи API, личные токены.

В проекте обычно есть **`.gitignore`** — он должен исключать `.env`, `node_modules`, `dist`, `uploads` и т.д. Перед первым коммитом откройте `.gitignore` и при необходимости допишите строки.

Проверка перед коммитом:

```bash
git status
```

Убедитесь, что `.env` и чувствительные файлы **не** в списке «Changes to be committed».

### 3. Создайте пустой репозиторий на GitHub

1. Войдите на [github.com](https://github.com).
2. **New repository** (новый репозиторий).
3. Имя (например `requirements-app`), видимость **Public** или **Private**.
4. **Не** ставьте галочки «Add README / .gitignore / license», если уже есть локальный проект — так проще первый push.

Скопируйте URL репозитория (HTTPS или SSH), например:

- HTTPS: `https://github.com/USERNAME/requirements-app.git`
- SSH: `git@github.com:USERNAME/requirements-app.git`

### 4. Инициализация и первый push (если Git в проекте ещё не настроен)

В корне папки проекта (`requirements-app-test`):

```bash
cd путь/к/requirements-app-test
git init
git add .
git commit -m "Initial commit: учёт предложений, backend и frontend"
git branch -M main
git remote add origin https://github.com/USERNAME/requirements-app.git
git push -u origin main
```

При HTTPS GitHub попросит логин: для пароля давно используют **Personal Access Token** (Settings → Developer settings → Personal access tokens), не пароль от аккаунта.

Если репозиторий **уже** был инициализирован (`git status` уже показывает ветку):

```bash
git remote add origin https://github.com/USERNAME/requirements-app.git   # если remote ещё нет
git push -u origin main
```

Если `origin` уже есть с другим URL:

```bash
git remote set-url origin https://github.com/USERNAME/NEW-REPO.git
```

### 5. Дальнейшая работа (типичный цикл)

```bash
git pull origin main          # перед работой — подтянуть чужие изменения
# ... правки в коде ...
git status
git add .
git commit -m "Описание изменений одним предложением"
git push origin main
```

Сообщения коммитов лучше писать **понятно**: что сделано и зачем, без лишнего жаргона.

---

## Полезные привычки

1. **Частые небольшие коммиты** удобнее одного гигантского.
2. **Перед push** — `git status` и при совместной работе — `git pull`.
3. **Ветки** для задач: `feature/export-csv`, потом merge в `main` через Pull Request на GitHub.
4. **Не коммитить** сгенерированное (`node_modules`, `dist`) и секреты — только если это не принято в команде и не описано в `.gitignore`.

---

## Частые ситуации

### Отменить изменения в файле до коммита (осторожно: правки пропадут)

```bash
git checkout -- имя-файла    # старый синтаксис
# или
git restore имя-файла      # в современном Git
```

### Убрать файл из индекса, но оставить на диске

```bash
git restore --staged имя-файла
```

### «Забыли» добавить в `.gitignore` уже закоммиченный файл

Нужно убрать из индекса и закоммитить удаление из репозитория (файл на диске может остаться):

```bash
git rm --cached путь/к/файлу
git commit -m "Stop tracking sensitive file"
```

Секреты, уже попавшие в историю, **лучше считать скомпрометированными** — смените пароли/ключи.

---

## Где учиться дальше

- Официальная книга Pro Git (есть переводы): [git-scm.com/book](https://git-scm.com/book/ru/v2)
- Справка по командам: `git help commit`, `git help push`

---

## Краткий чеклист «репозиторий на GitHub»

1. `git config` — имя и email.  
2. Проверить `.gitignore`, не светить `.env`.  
3. Создать репозиторий на GitHub.  
4. `git init` / `git add` / `git commit` / `remote add` / `push`.  
5. Дальше: правки → `commit` → `push`.
