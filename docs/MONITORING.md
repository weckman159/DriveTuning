# DRIVETUNING — Мониторинг

## 1. Vercel Analytics (включено автоматически)

Vercel Analytics включен по умолчанию для всех проектов на Vercel.

**Где смотреть:**
- Dashboard → Analytics
- URL: https://vercel.com/dashboard

**Доступные метрики:**
- Page views
- Unique visitors
- Sessions
- Geography (страны/города)
- Devices (desktop/mobile)
- Browsers

---

## 2. Vercel Speed Insights (включено)

**Status:** ✅ Установлен `@vercel/speed-insights`

**Где смотреть:**
- Dashboard → Speed Insights
- URL: https://vercel.com/dashboard

**Метрики:**
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)

**Конфигурация:**
```tsx
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

---

## 3. UptimeRobot (бесплатный мониторинг)

### Регистрация

1. Перейдите на https://uptimerobot.com/
2. Нажмите "Sign Up Free"
3. Зарегистрируйтесь (бесплатный план: 5 мониторов)

### Создание мониторов

| Type | URL | Interval | Name |
|------|-----|----------|------|
| HTTP(s) | https://drivetuning.vercel.app/api/health | 5 min | DRIVETUNING Health |
| HTTP(s) | https://drivetuning.vercel.app/garage | 30 min | DRIVETUNING Garage |
| HTTP(s) | https://drivetuning.vercel.app/market | 30 min | DRIVETUNING Market |

### Настройка алертов

**Бесплатный план:**
- Email уведомления (неограниченно)
- Push-уведомления (мобильное приложение)

**Настройка:**
1. Dashboard → Add New Monitor
2. Type: HTTP(s)
3. URL: `https://drivetuning.vercel.app/api/health`
4. Friendly Name: `DRIVETUNING Health Check`
5. Monitoring Interval: 5 minutes
6. Alerts: ✅ Email, ✅ Push

---

## 4. Дополнительные мониторы

### Ping/Heartbeat (альтернатива UptimeRobot)

```bash
# Cron job для Linux/macOS
# Добавьте в crontab:
*/5 * * * * curl -s https://drivetuning.vercel.app/api/health >> /var/log/drivetuning.log
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T11:55:00.000Z",
  "version": "1.0.0",
  "uptime": 12345.67
}
```

---

## 5. Сводка по мониторингу

| Сервис | Тип | Стоимость | Статус |
|--------|-----|-----------|--------|
| Vercel Analytics | Веб-аналитика | Бесплатно | ✅ Автоматически |
| Vercel Speed Insights | Производительность | Бесплатно | ✅ Установлено |
| UptimeRobot | Uptime | Бесплатно (5 мониторов) | Настроить вручную |
| Health API | Мониторинг | Бесплатно | ✅ Создано |

---

## 6. Быстрые ссылки

| Сервис | URL |
|--------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| UptimeRobot | https://uptimerobot.com/ |
| Health Check | https://drivetuning.vercel.app/api/health |
