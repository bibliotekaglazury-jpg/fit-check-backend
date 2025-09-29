# 🚀 Быстрый запуск Fit-Check Backend

Этот файл поможет вам быстро запустить и протестировать API для получения представления о функциональности.

## 📝 Минимальная настройка для тестирования

### 1. Скопируйте и настройте .env файл
```bash
cp .env.example .env
```

**Минимальные настройки для работы (замените на ваши значения):**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/fit_check_db"
JWT_SECRET="supersecret-change-this-in-production-minimum-32-characters"
GEMINI_API_KEY="ваш-gemini-api-ключ"
CLOUDINARY_CLOUD_NAME="ваш-cloud-name"
CLOUDINARY_API_KEY="ваш-api-ключ"
CLOUDINARY_API_SECRET="ваш-api-секрет"
PORT=5000
NODE_ENV="development"
```

### 2. Установите зависимости
```bash
npm install
```

### 3. Настройте базу данных
```bash
# Создайте базу данных в PostgreSQL
createdb fit_check_db

# Примените миграции
npx prisma migrate dev --name init

# (Опционально) Откройте Prisma Studio для визуального управления данными
npx prisma studio
```

### 4. Запустите сервер
```bash
npm run dev
```

Сервер запустится на http://localhost:5000

## 🧪 Быстрое тестирование API

### Проверьте работу сервера
```bash
curl http://localhost:5000/health
```

### Зарегистрируйте пользователя
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

Ответ содержит access token, сохраните его для дальнейших запросов.

### Войдите в систему
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Получите профиль пользователя
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Получите гардероб (пустой для нового пользователя)
```bash
curl -X GET http://localhost:5000/api/wardrobe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Добавьте элемент в гардероб
```bash
curl -X POST http://localhost:5000/api/wardrobe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "name=Тестовая рубашка" \
  -F "category=TOP" \
  -F "color=Синий" \
  -F "tags=[\"casual\", \"работа\"]" \
  -F "image=@/путь/к/изображению.jpg"
```

### Получите статистику гардероба
```bash
curl -X GET http://localhost:5000/api/wardrobe/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Основные endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Профиль пользователя
- `PUT /api/auth/profile` - Обновить профиль
- `PUT /api/auth/change-password` - Сменить пароль

### Гардероб
- `GET /api/wardrobe` - Список элементов гардероба
- `POST /api/wardrobe` - Добавить элемент
- `GET /api/wardrobe/:id` - Получить элемент
- `PUT /api/wardrobe/:id` - Обновить элемент
- `DELETE /api/wardrobe/:id` - Удалить элемент
- `GET /api/wardrobe/stats` - Статистика

### Системные
- `GET /health` - Проверка работы сервера
- `GET /` - Информация о API

## 🎨 Тестирование с помощью инструментов

### Postman
1. Импортируйте коллекцию (создать можно на основе curl команд выше)
2. Настройте переменную `{{baseUrl}}` = `http://localhost:5000`
3. Настройте переменную `{{accessToken}}` после получения токена

### Thunder Client (VS Code)
1. Установите расширение Thunder Client
2. Создайте новую коллекцию
3. Добавьте запросы из примеров выше

### curl (командная строка)
Все примеры выше используют curl и готовы к использованию.

## ⚠️ Важные заметки

1. **База данных**: Убедитесь, что PostgreSQL запущен и доступен
2. **API ключи**: Получите реальные ключи для Gemini и Cloudinary для полной функциональности
3. **Безопасность**: JWT_SECRET должен быть случайным и достаточно длинным
4. **Файлы**: Для тестирования загрузки изображений используйте файлы .jpg, .png, .webp размером до 10MB

## 🐛 Проблемы?

### База данных недоступна
```bash
# Проверьте статус PostgreSQL
brew services list | grep postgres  # macOS
sudo systemctl status postgresql     # Linux

# Перезапустите PostgreSQL если нужно
brew services restart postgresql     # macOS
sudo systemctl restart postgresql    # Linux
```

### Ошибки миграций
```bash
# Сбросьте базу данных и создайте заново
npx prisma migrate reset
npx prisma migrate dev --name init
```

### Порт занят
```bash
# Найдите процесс на порту 5000
lsof -i :5000

# Завершите процесс
kill -9 PID
```

## 🎯 Следующие шаги

После успешного тестирования базовой функциональности:

1. Настройте реальные API ключи для Gemini и Cloudinary
2. Изучите полную документацию в README.md
3. Интегрируйте с фронтенд приложением
4. Настройте деплой на сервер

---

**Удачного тестирования! 🚀**