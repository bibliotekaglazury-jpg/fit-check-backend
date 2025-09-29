# Fit-Check Backend API 👗✨

Серверная часть приложения Fit-Check - виртуальной примерочной с использованием искусственного интеллекта для генерации изображений модной одежды.

## 🎯 Основные возможности

- **Аутентификация пользователей** - регистрация, вход, управление профилем
- **Персональный гардероб** - добавление, редактирование и управление элементами одежды
- **Виртуальная примерочная** - генерация изображений с помощью Google Gemini AI
- **Управление проектами** - сохранение и организация примерок
- **Загрузка файлов** - интеграция с Cloudinary для хранения изображений
- **REST API** - полнофункциональное API с документацией

## 🛠 Технический стек

- **Node.js** + **TypeScript** - основа сервера
- **Express.js** - веб-фреймворк
- **PostgreSQL** - база данных
- **Prisma ORM** - работа с базой данных
- **Google Gemini AI** - генерация изображений
- **Cloudinary** - хранение изображений
- **JWT** - аутентификация
- **Multer** - загрузка файлов
- **Docker** (опционально) - контейнеризация

## 📋 Предварительные требования

Убедитесь, что у вас установлены:

- [Node.js](https://nodejs.org/) (версия 18 или выше)
- [npm](https://www.npmjs.com/) или [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (версия 14 или выше)
- [Git](https://git-scm.com/)

## 🚀 Установка и запуск

### 1. Клонируйте репозиторий
```bash
git clone <repository-url>
cd fit-check-backend
```

### 2. Установите зависимости
```bash
npm install
```

### 3. Настройте переменные окружения
Скопируйте файл с примером переменных:
```bash
cp .env.example .env
```

Отредактируйте файл `.env` и укажите ваши настройки:
```env
# База данных PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/fit_check_db"

# Секретный ключ для JWT (создайте надежный ключ!)
JWT_SECRET="ваш-очень-секретный-ключ-минимум-32-символа"

# Google Gemini API
GEMINI_API_KEY="ваш-ключ-gemini-api"

# Cloudinary для хранения изображений
CLOUDINARY_CLOUD_NAME="ваше-имя-cloud"
CLOUDINARY_API_KEY="ваш-api-ключ"
CLOUDINARY_API_SECRET="ваш-api-секрет"

# Настройки сервера
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

### 4. Настройте базу данных
Создайте базу данных PostgreSQL:
```bash
# Войдите в PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE fit_check_db;

# Создайте пользователя (опционально)
CREATE USER fit_check_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fit_check_db TO fit_check_user;

# Выйдите из psql
\\q
```

Примените миграции базы данных:
```bash
npx prisma migrate dev --name init
```

### 5. Запустите сервер
Для разработки (с автоматической перезагрузкой):
```bash
npm run dev
```

Для продакшена:
```bash
npm run build
npm start
```

### 6. Проверьте запуск
Откройте браузер и перейдите по адресу:
- API: http://localhost:5000
- Проверка здоровья: http://localhost:5000/health

## 🔧 Получение ключей для внешних сервисов

### Google Gemini API
1. Перейдите на [Google AI Studio](https://aistudio.google.com/)
2. Создайте новый проект или выберите существующий
3. Получите API ключ
4. Укажите его в переменной `GEMINI_API_KEY`

### Cloudinary
1. Зарегистрируйтесь на [Cloudinary](https://cloudinary.com/)
2. В Dashboard найдите:
   - Cloud name
   - API Key
   - API Secret
3. Укажите эти данные в соответствующих переменных окружения

## 📚 API Документация

После запуска сервера API документация будет доступна по адресам:
- Swagger UI: http://localhost:5000/api/docs (планируется)
- Основные endpoints:

### Аутентификация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/profile` - Получить профиль пользователя
- `PUT /api/auth/profile` - Обновить профиль
- `PUT /api/auth/change-password` - Сменить пароль

### Гардероб
- `GET /api/wardrobe` - Получить элементы гардероба
- `POST /api/wardrobe` - Добавить элемент в гардероб
- `GET /api/wardrobe/:id` - Получить конкретный элемент
- `PUT /api/wardrobe/:id` - Обновить элемент
- `DELETE /api/wardrobe/:id` - Удалить элемент
- `GET /api/wardrobe/stats` - Статистика гардероба

## 🧪 Тестирование API

### Примеры запросов

#### Регистрация пользователя
```bash
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "Иван Иванов"
  }'
```

#### Вход в систему
```bash
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com", 
    "password": "SecurePass123!"
  }'
```

#### Добавление элемента в гардероб
```bash
curl -X POST http://localhost:5000/api/wardrobe \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "name=Красивая рубашка" \\
  -F "category=TOP" \\
  -F "color=Белый" \\
  -F "tags=[\"casual\", \"офисный стиль\"]" \\
  -F "image=@/path/to/shirt.jpg"
```

## 🗂 Структура проекта

```
fit-check-backend/
├── prisma/
│   └── schema.prisma          # Схема базы данных
├── src/
│   ├── controllers/           # Контроллеры (логика обработки запросов)
│   ├── middleware/            # Middleware функции
│   ├── models/                # Модели данных
│   ├── routes/                # Определение маршрутов API
│   ├── services/              # Сервисы (внешние API, утилиты)
│   ├── types/                 # TypeScript типы
│   ├── utils/                 # Вспомогательные функции
│   └── server.ts              # Основной файл сервера
├── .env                       # Переменные окружения (не в git)
├── .env.example               # Пример переменных окружения
├── package.json               # Зависимости и скрипты
├── tsconfig.json              # Настройки TypeScript
└── README.md                  # Документация проекта
```

## 🐳 Docker (опционально)

Если у вас установлен Docker, вы можете запустить приложение в контейнере:

```bash
# Сборка образа
docker build -t fit-check-backend .

# Запуск контейнера
docker run -p 5000:5000 --env-file .env fit-check-backend
```

## 🔍 Мониторинг и отладка

### Проверка работы сервиса
```bash
# Проверка здоровья сервера
curl http://localhost:5000/health

# Проверка подключения к базе данных
npm run prisma:studio
```

### Логи
Сервер выводит подробные логи в консоль. В продакшене рекомендуется настроить внешний сервис логирования.

## 🚨 Безопасность

- Все пароли хешируются с использованием bcrypt
- JWT токены для аутентификации
- Валидация всех входных данных
- Rate limiting для защиты от DDoS
- CORS настроен для безопасности
- Helmet.js для дополнительной защиты

## 📈 Производительность

- Пагинация для больших списков данных
- Оптимизированные запросы к базе данных
- Автоматическая оптимизация изображений в Cloudinary
- Кеширование (планируется добавить Redis)

## 🤝 Разработка

### Команды для разработки
```bash
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка для продакшена
npm run start        # Запуск продакшен сборки
npm run prisma:studio    # Открыть Prisma Studio
npm run prisma:migrate   # Применить миграции
npm run prisma:generate  # Сгенерировать Prisma клиент
```

### Добавление новых features
1. Создайте ветку: `git checkout -b feature/new-feature`
2. Внесите изменения
3. Добавьте тесты (если применимо)
4. Создайте Pull Request

## 🐛 Устранение неполадок

### Частые проблемы

**База данных недоступна**
- Убедитесь, что PostgreSQL запущен
- Проверьте правильность DATABASE_URL в .env

**Ошибки с изображениями**
- Проверьте настройки Cloudinary
- Убедитесь, что у вас достаточно места в аккаунте

**JWT ошибки**
- Проверьте, что JWT_SECRET установлен
- Убедитесь, что токен не истек

## 📄 Лицензия

Этот проект создан для образовательных целей.

## 📞 Поддержка

При возникновении вопросов создайте issue в репозитории или обратитесь к разработчику.

---

**Сделано с ❤️ для современной моды и технологий**