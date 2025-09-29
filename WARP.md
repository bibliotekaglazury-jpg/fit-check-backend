# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Архитектура проекта

Это Firebase-based бэкенд для приложения удаления водяных знаков с изображений. Основные компоненты:

### Структура проекта
- **`functions/src/index.ts`** - Основные cloud functions для обработки изображений через Gemini AI
- **`functions/src/payments.ts`** - Система платежей через Stripe
- **`firestore.rules`** - Правила безопасности базы данных
- **`firestore.indexes.json`** - Индексы для оптимизации запросов

### Ключевые Cloud Functions

#### `removeWatermarkWithAI`
Основная функция замены небезопасного клиентского вызова Gemini API. Включает:
- Проверку аутентификации и лимитов пользователя
- Безопасный вызов Gemini AI с серверными API ключами  
- Управление кредитами (3 для бесплатных, безлимит для Pro)
- Сохранение истории обработки

#### `createCheckoutSession` 
Создает Stripe checkout сессии для Pro подписок с поддержкой месячных и годовых планов.

#### `handleStripeWebhook`
Обрабатывает webhook события от Stripe для активации подписок.

### База данных Firestore

**Коллекции:**
- `users` - информация о пользователях и подписках
- `processing_history` - история обработки изображений
- `payments` - записи о платежах
- `payment_sessions` - статусы платежных сессий

## Команды разработки

### Установка зависимостей
```bash
# Основной проект
npm install

# Cloud Functions
cd functions && npm install
```

### Локальная разработка
```bash
# Запуск Firebase эмуляторов
firebase emulators:start

# Сборка functions в watch режиме
cd functions && npm run build:watch
```

### Сборка и деплой
```bash
# Сборка TypeScript в JavaScript
npm run build

# Деплой всего проекта
firebase deploy

# Деплой только functions
firebase deploy --only functions
```

### Мониторинг и отладка
```bash
# Просмотр логов functions
firebase functions:log

# Просмотр конфигурации
firebase functions:config:get
```

### Тестирование
```bash
# Локальное тестирование с эмуляторами
firebase emulators:start --only functions,firestore

# Тест функций через curl (пример)
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/removeWatermarkWithAI \
  -H "Content-Type: application/json" \
  -d '{"data": {"parts": [{"text": "test"}]}}'
```

## Настройка окружения

### Обязательные переменные Firebase Functions Config
```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
firebase functions:config:set app.frontend_url="https://your-domain.com"
```

### Опциональные (для платежей)
```bash
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set stripe.pro_monthly_price_id="price_..."
firebase functions:config:set stripe.pro_yearly_price_id="price_..."
```

## Система безопасности

### Firestore правила
- Пользователи могут читать/писать только свои данные
- Cloud Functions имеют особые права для создания записей
- Администраторы (коллекция `admins`) имеют расширенные права

### API безопасность  
- Gemini API ключи хранятся только на сервере
- Аутентификация через Firebase Auth
- Валидация входных данных в functions
- Система лимитов по планам подписки

## Интеграция с фронтендом

Основные изменения для замены небезопасного клиентского вызова:

**Старый небезопасный код:**
```typescript
const ai = new GoogleGenerativeAI(API_KEY); // API ключ виден в браузере
```

**Новый безопасный код:**
```typescript
const removeWatermarkCallable = httpsCallable(functions, 'removeWatermarkWithAI');
const result = await removeWatermarkCallable({ parts });
```

### Обязательная настройка Firebase в фронтенде
```typescript
import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";

const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app);
export const auth = getAuth(app);
```

## Системы подписок

### Планы
- **Free**: 3 бесплатных попытки
- **Pro Monthly/Yearly**: Безлимитная обработка

### Workflow оплаты
1. `createCheckoutSession` → создание Stripe сессии
2. Перенаправление на Stripe Checkout
3. `handleStripeWebhook` → активация подписки
4. Обновление статуса пользователя в Firestore

## Мониторинг производительности

### Проблемы производительности
- Большие изображения могут вызывать timeout
- Gemini API имеет лимиты на размер запроса
- Firestore операции должны быть оптимизированы

### Оптимизация
- Используйте индексы из `firestore.indexes.json`
- Сжимайте изображения перед отправкой
- Контролируйте размер истории обработки

## Требования системы

- Node.js 20+
- Firebase CLI
- План Firebase Blaze (для external API calls)
- Gemini API ключ
- Stripe аккаунт (опционально)

## Важные ограничения

- Максимальный размер изображения ограничен Gemini API
- Cloud Functions имеют timeout (по умолчанию 60s, максимум 540s)
- Firestore имеет лимиты на размер документа (1 МБ)
- В коде используется модель `gemini-2.0-flash-exp`

## Частые проблемы

### "Gemini API key не найден"
```bash
firebase functions:config:set gemini.api_key="your_key"
firebase deploy --only functions
```

### "Permission denied" ошибки
Проверьте правила Firestore и убедитесь что пользователь аутентифицирован.

### Webhook не работает
Убедитесь что `stripe.webhook_secret` настроен и endpoint URL правильный в Stripe Dashboard.

### Timeout при обработке больших изображений
Увеличьте timeout для Cloud Functions или уменьшите размер изображения на фронтенде.