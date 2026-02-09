# DriveTuning — что сделано (срез на 2026-02-09)

Этот файл фиксирует текущий набор реализованных функций/компонентов в репозитории и результаты последних интеграций (легальность DE, профиль, деплой).

## 1) Текущий стек и архитектура

- Frontend/Backend: Next.js (App Router).
- БД/ORM: Prisma.
  - `prisma/schema.prisma` — SQLite (локальная разработка).
  - `prisma/schema.postgres.prisma` — PostgreSQL (prod/preview).
  - Синхронизация схем обеспечивается скриптами `scripts/prisma-*.cjs`.
- Auth: NextAuth.
- Файлы/документы: поддержка загрузок (в т.ч. через Vercel Blob; есть фолбэки/обвязка в проекте).
- Деплой: Vercel (build via `npm run vercel-build`).

## 2) Базовый продукт (уже работало/есть в проекте)

- Гаражи, автомобили, страницы авто.
- Таймлайн/лог (записи по авто: модификации, обслуживание и т.п.).
- Документы и привязка документов к событиям/модификациям.
- Задачи (Build Tasks).
- Маркетплейс: объявления, чат/переписки, офферы (в проекте присутствуют API/страницы).
- Шаринг через токены (share links).
- Экспорт PDF (в проекте есть соответствующий API/генерация).
- Базовая легальность через `tuvStatus` (исторически).

## 3) Профиль: “кнопки не работали” → исправлено

Цель: чтобы профиль действительно сохранялся в БД, а не был “макетом”.

Сделано:

- UI профиля переведён на загрузку/сохранение через API:
  - `app/settings/profile/page.tsx`
- API профиля:
  - `app/api/settings/profile/route.ts`
  - Поддерживает `GET` (загрузка) и `PATCH` (обновление).
  - Валидация username (и логика “set once”: блокировка повторной смены после фиксации).
  - Обновление display name / bio / location / website / соц. ссылок.
  - Аватар: загрузка через `avatarDataUrl` (data URL) и сохранение через внутреннюю функцию хранения (обвязка проекта).
- Модель данных:
  - Добавлен `UserProfile` в обе схемы Prisma (SQLite + Postgres) и миграция.

## 4) Легальность тюнинга (Германия): база, валидатор, API, справочники

### 4.1 Справочники (статические JSON)

- `data/reference/tuning-legality-de.json`
  - Категории/подкатегории, определения типов разрешений, базовые правила и дисклеймер.
- `data/reference/german-legal-framework.json`
  - Нормативная база (StVZO/BImSchG/FZV + ECE), ссылки/краткие описания.
- Региональные данные/правила (земли, особенности контроля) — в `data/reference/…` и в `lib/legality/*`.
- “Verified approvals” (подборки по категориям):
  - `data/reference/verified-*-approvals.json`
  - Импортируются в БД скриптом и **помечаются как `isSynthetic=true` до полноценного аудита/подтверждения первичными источниками**.

### 4.2 База данных (Prisma модели + миграции)

Ключевые сущности:

- `LegalityReference` — справочник деталей/разрешений (KBA/производители/и т.п.).
- `LegalityContribution` — краудсорсинг кейсов прохождения/внесения (с модерацией).
- `LegalityRegionalRule` / `State` (если используются в конкретной версии схемы) — региональные правила/метаданные.
- Расширения `Modification`, `Car`, `PartListing` (поля легальности, параметры пользователя, привязки).

Миграции в репозитории:

- `prisma/migrations/20260209180000_init_postgres`
- `prisma/migrations/20260209194000_legality_reference`
- `prisma/migrations/20260209203000_partlisting_legality`
- `prisma/migrations/20260209205000_legality_contributions`
- `prisma/migrations/20260209212000_car_state_and_mod_params`
- `prisma/migrations/20260209233000_event_state_visibility`
- `prisma/migrations/20260209234500_user_profile`

Примечание:

- `prisma/migrations/20250203120000_init` — исторический/плейсхолдерный init (не является prod-init для Postgres).

### 4.3 API легальности

- Проверка легальности (текущая реализация использует **GET** с query-параметрами):
  - `app/api/legality/check/route.ts`
  - Возвращает:
    - `approvalType`, `legalityStatus`, `violations`, `nextSteps`, `warnings`
    - `dbMatches` (совпадения из `LegalityReference`)
    - `communityProofs` (одобренные кейсы из краудсорсинга)
  - Добавляет юридические ссылки к нарушениям через `lib/legality/legal-references`.
  - Применяет региональные правила через `lib/legality/regional-rules`.

Важно (исправлено в последнем деплое 2026-02-09):

- Если справочник найден в БД (`dbMatches`), `approvalType`/`legalityStatus` теперь вычисляются корректно даже когда в статическом словаре `bestMatch` отсутствует.

### 4.4 Краудсорсинг и админка

- Эндпоинт внесения кейса (submission) и модерация:
  - `app/api/legality/contribute/*`
  - `app/admin/legality-contributions/*`
  - Логика: contributions попадают в `PENDING`, затем админ может `APPROVE/REJECT`.

### 4.5 Импорт/обновление справочников

Скрипты:

- `npm run ref:legality-seed:import`
  - Импорт `data/reference/legality-reference-seed.json` (если файл присутствует).
- `npm run ref:verified-approvals:import`
  - Импорт `data/reference/verified-*-approvals.json` → `LegalityReference` (fingerprint `verified:*`).
- `npm run ref:kba-abe:import` и `npm run ref:kba-abe:upsert`
  - Импорт/апсерт KBA ABE (через данные/сырьё проекта).
- `npm run legality:migrate:tuv`
  - Миграция семантики `tuvStatus` → `legalityStatus` (если нужно для исторических данных).

## 5) Маркетплейс: легальность как фильтр/метрика

В проекте присутствуют:

- Поля легальности в `PartListing` (для фильтрации и бейджей).
- API выдачи объявлений с фильтрами.
- Компоненты бейджей легальности и использование в карточках.
- Обновлённый `evidenceScore`/логика “доказательности” (если включено в текущей ветке).

## 6) Документация внутри репозитория

Ключевые файлы:

- `docs/DEPLOYMENT_CHECKLIST.md` — чеклист деплоя.
- `docs/REFERENCE_TUNING_LEGALITY_DE.md` — описание справочника легальности DE.
- `docs/LEGALITY_API_EXAMPLES_DE.md` — примеры запросов к API легальности.
- `docs/ROADMAP_2026.md` — план развития.
- `docs/AGENTS.md` — правила/подсказки для работы с репо (важно соблюдать при изменениях).

## 7) Деплой (что делалось)

### 7.1 GitHub

- Репозиторий пушится в форк:
  - `https://github.com/weckman159/DriveTuning.git`

### 7.2 Vercel (prod)

- Деплой выполняется Vercel CLI из локальной папки проекта.
- Домены/URL:
  - `https://drivetuning.vercel.app`
- Build:
  - `npm run vercel-build` → `prisma:generate` + `prisma:sync` + `next build`
  - `prisma:sync` на Postgres выполняет `prisma migrate deploy`.

### 7.3 Наполнение prod БД справочником

В prod БД загружены справочные записи (через локальный запуск скриптов с prod env):

- `ref:legality-seed:import` → upserted=9
- `ref:verified-approvals:import` → upserted=38

## 8) Известные оговорки/техдолг

- В сборке встречается предупреждение о несовпадении версий `@next/swc` и `next` (не блокирует билд, но лучше выровнять версии).
- `/api/legality/check` сейчас реализован как `GET` (а не `POST`); фронт использует query string.
- “Verified approvals” сейчас импортируются как `isSynthetic=true` (пока не организован полный аудит первичными источниками).

## 9) Безопасность (важно)

- Секреты и токены нельзя публиковать в репозитории или чатах.
- Если токен GitHub/другие секреты были случайно показаны — их нужно отозвать (revoke) и выпустить новые.

