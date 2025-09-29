import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { isValidEmail, isValidPassword } from '../utils';

// Middleware для валидации регистрации пользователя
export const validateUserRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  // Проверка обязательных полей
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email и пароль обязательны'
    });
  }

  // Валидация email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат email'
    });
  }

  // Валидация пароля
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Пароль не соответствует требованиям',
      errors: passwordValidation.errors
    });
  }

  // Валидация имени (если предоставлено)
  if (name && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50)) {
    return res.status(400).json({
      success: false,
      message: 'Имя должно содержать от 2 до 50 символов'
    });
  }

  next();
};

// Middleware для валидации входа пользователя
export const validateUserLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email и пароль обязательны'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат email'
    });
  }

  if (typeof password !== 'string' || password.length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Пароль не может быть пустым'
    });
  }

  next();
};

// Middleware для валидации элементов гардероба
export const validateWardrobeItem = (req: Request, res: Response, next: NextFunction) => {
  const { name, category, color, tags } = req.body;
  const isUpdate = req.method === 'PUT';

  // Для создания, name и category обязательны
  if (!isUpdate && (!name || !category)) {
    return res.status(400).json({
      success: false,
      message: 'Название и категория обязательны'
    });
  }

  // Валидация названия
  if (name && (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Название должно содержать от 1 до 100 символов'
    });
  }

  // Валидация категории
  const validCategories = ['TOP', 'BOTTOM', 'OUTERWEAR', 'DRESS', 'SHOES', 'ACCESSORIES'];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Недопустимая категория. Разрешенные: ${validCategories.join(', ')}`
    });
  }

  // Валидация цвета
  if (color && (typeof color !== 'string' || color.trim().length > 50)) {
    return res.status(400).json({
      success: false,
      message: 'Цвет не может содержать более 50 символов'
    });
  }

  // Валидация тегов
  if (tags) {
    let parsedTags;
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Теги должны быть в формате JSON массива'
      });
    }

    if (!Array.isArray(parsedTags)) {
      return res.status(400).json({
        success: false,
        message: 'Теги должны быть массивом'
      });
    }

    if (parsedTags.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Максимум 20 тегов'
      });
    }

    for (const tag of parsedTags) {
      if (typeof tag !== 'string' || tag.trim().length < 1 || tag.trim().length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Каждый тег должен содержать от 1 до 30 символов'
        });
      }
    }
  }

  next();
};

// Middleware для валидации изменения пароля
export const validatePasswordChange = (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Текущий и новый пароль обязательны'
    });
  }

  // Валидация нового пароля
  const passwordValidation = isValidPassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Новый пароль не соответствует требованиям',
      errors: passwordValidation.errors
    });
  }

  // Проверяем, что новый пароль отличается от текущего
  if (currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Новый пароль должен отличаться от текущего'
    });
  }

  next();
};

// Middleware для валидации обновления профиля
export const validateProfileUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { name, avatar } = req.body;

  // Проверяем, что передан хотя бы один параметр
  if (name === undefined && avatar === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Необходимо указать хотя бы один параметр для обновления'
    });
  }

  // Валидация имени
  if (name !== undefined) {
    if (name !== null && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Имя должно содержать от 2 до 50 символов'
      });
    }
  }

  // Валидация аватара
  if (avatar !== undefined) {
    if (avatar !== null && (typeof avatar !== 'string' || !isValidUrl(avatar))) {
      return res.status(400).json({
        success: false,
        message: 'Аватар должен быть валидным URL'
      });
    }
  }

  next();
};

// Middleware для валидации параметров пагинации
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;

  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Номер страницы должен быть положительным числом'
    });
  }

  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Лимит должен быть числом от 1 до 100'
    });
  }

  next();
};

// Middleware для валидации ID параметров
export const validateId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: `Неверный ${paramName}`
      });
    }

    // Базовая проверка формата ID (CUID обычно содержит буквы и цифры)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Неверный формат ${paramName}`
      });
    }

    next();
  };
};

// Middleware для валидации поиска
export const validateSearch = (req: Request, res: Response, next: NextFunction) => {
  const { search, category, tags } = req.query;

  if (search && (typeof search !== 'string' || search.length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Поисковый запрос не может содержать более 100 символов'
    });
  }

  if (category && typeof category !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Категория должна быть строкой'
    });
  }

  if (tags && typeof tags !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Теги должны быть строкой с разделителями-запятыми'
    });
  }

  next();
};

// Утилитная функция для проверки URL
const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Middleware для логирования запросов (для отладки)
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.userId || 'anonymous'
  });
  next();
};

// Middleware для установки безопасных заголовков
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Предотвращение MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Защита от XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Предотвращение clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  next();
};