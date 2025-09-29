import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Импорты маршрутов
import authRoutes from './routes/authRoutes';
import wardrobeRoutes from './routes/wardrobeRoutes';
import aiRoutes from './routes/aiRoutes';

// Импорты утилит
import { connectDatabase, disconnectDatabase } from './utils/database';
import { logger } from './utils';
import { AppError } from './types';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Базовые middleware
app.use(helmet()); // Безопасность
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})); // CORS
app.use(express.json({ limit: '50mb' })); // Парсинг JSON (увеличенный лимит для base64 изображений)
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Парсинг URL-encoded данных

// Логирование запросов
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Здоровье сервера - простой endpoint для проверки статуса
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Fit-Check Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/ai', aiRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Добро пожаловать в Fit-Check API! 👗✨',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      wardrobe: '/api/wardrobe',
      ai: '/api/ai',
      health: '/health'
    }
  });
});

// Middleware для обработки 404 ошибок (маршрут не найден)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Маршрут ${req.originalUrl} не найден`
  });
});

// Глобальный обработчик ошибок
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  // Ошибки валидации Multer (загрузка файлов)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Файл слишком большой. Максимальный размер: 10MB'
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Слишком много файлов'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Неожиданное поле файла'
    });
  }

  // Ошибки Prisma (база данных)
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Данные уже существуют'
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Запись не найдена'
    });
  }

  // Кастомные ошибки приложения
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  // Ошибки валидации JSON
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат JSON'
    });
  }

  // Все остальные ошибки
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    message: isDevelopment ? error.message : 'Внутренняя ошибка сервера',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Подключаемся к базе данных
    await connectDatabase();
    
    // Запускаем HTTP сервер
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Fit-Check Backend запущен на порту ${PORT}`);
      logger.info(`📖 API документация: http://localhost:${PORT}/api/docs`);
      logger.info(`🏥 Проверка здоровья: http://localhost:${PORT}/health`);
      logger.info(`🌍 Окружение: ${process.env.NODE_ENV || 'development'}`);
    });

    // Обработчики завершения работы сервера
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Получен сигнал ${signal}. Начинаю корректное завершение работы...`);
      
      server.close(() => {
        logger.info('HTTP сервер закрыт');
      });

      await disconnectDatabase();
      process.exit(0);
    };

    // Обработка сигналов завершения
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Обработка необработанных ошибок
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception thrown:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Не удалось запустить сервер:', error);
    process.exit(1);
  }
};

// Запускаем сервер
startServer();

export default app;