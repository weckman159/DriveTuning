# DRIVETUNING — Тестирование

## 1. Health Check

```bash
curl https://drivetuning.vercel.app/api/health
```

Ожидаемый ответ:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T...",
  "version": "1.0.0"
}
```

## 2. Страницы для проверки

### Главная страница
- URL: https://drivetuning.vercel.app/
- Проверить: Sky-blue логотип, dark theme

### Garage
- URL: https://drivetuning.vercel.app/garage
- Проверить: 2 демо-гаража (M-Power Lab, Berlin Tuners)
- Проверить: Кнопка "+ Add Garage"

### Car Detail (BMW M4 G82)
- URL: https://drivetuning.vercel.app/cars/m4-g82
- Проверить: Hero image
- Проверить: Project Goal (TRACK/SHOW)
- Проверить: Journal entries
- Проверить: TÜV badge (желтый для ABE, зеленый для registered)

### Parts Marketplace
- URL: https://drivetuning.vercel.app/market
- Проверить: 3 демо-объявления (KW V3 coilovers, Brembo brakes, BBS rims)
- Проверить: Фильтры (brand, condition, price range)

### Create Listing
- URL: https://drivetuning.vercel.app/market/new
- Проверить: Форма создания объявления
- Проверить: Auto-fill при modificationId

### Events
- URL: https://drivetuning.vercel.app/events
- Проверить: 2 демо-события (Track Day Hockenheim, BMW Meet Berlin)

### Privacy Settings
- URL: https://drivetuning.vercel.app/settings/privacy
- Проверить: 3 toggle switches
- Проверить: Default visibility selector

## 3. API Endpoints

### GET /api/health
Health check endpoint

### POST /api/cars/[id]/log-entries
Создание записи в журнале

```bash
curl -X POST https://drivetuning.vercel.app/api/cars/m4-g82/log-entries \
  -H "Content-Type: application/json" \
  -d '{"type":"MODIFICATION","title":"New exhaust","date":"2024-01-15"}'
```

### POST /api/market/listings
Создание объявления

```bash
curl -X POST https://drivetuning.vercel.app/api/market/listings \
  -H "Content-Type: application/json" \
  -d '{"title":"Test part","price":500,"condition":"NEW"}'
```

### GET /api/settings/privacy
Получение настроек приватности

## 4. Ожидаемые демо-данные

### Гаражи
1. M-Power Lab (Schleswig-Holstein)
2. Berlin Tuners (Berlin)

### Машины
1. BMW M4 G82 (2022, TRACK) — серый, 65,230 km
2. Audi RS3 (DAZA, SHOW) — белый, 32,100 km

### Модификации
1. KW V3 coilovers (SUSPENSION, YELLOW_ABE)
2. Brembo GT6 brakes (BRAKES, GREEN_REGISTERED)
3. BBS LM wheels (WHEELS, YELLOW_ABE)

### Объявления
1. KW V3 coilovers — €2,450 (NEW)
2. Brembo GT6 set — €3,200 (LIKE_NEW)
3. BBS LM 19" — €4,500 (USED)

### События
1. Track Day Hockenheim (15.03.2025)
2. BMW Meet Berlin (28.03.2025)

## 5. TÜV Statuses

- 🟢 **GREEN_REGISTERED** — Деталь внесена в документы
- 🟡 **YELLOW_ABE** — Есть ABE (Allgemeine Betriebserlaubnis)
- 🔴 **RED_RACING** — Только для трека/гонок

## 6. Частые ошибки

### Ошибка 401 Unauthorized
Нужно войти в систему (NextAuth не настроен для демо)

### Ошибка 404 Not Found
Проверьте ID машины — должен быть `m4-g82` или `rs3-daza`

### Ошибка 500 Server Error
База данных не подключена — приложение работает с mock-данными
