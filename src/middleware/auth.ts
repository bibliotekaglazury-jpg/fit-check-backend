import { Request, Response, NextFunction } from 'express';
import { verifyToken, logger } from '../utils';
import { AppError } from '../types';
import prisma from '../utils/database';

// Расширяем тип Request, чтобы добавить user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware для проверки JWT токена
 * Извлекает токен из заголовка Authorization и проверяет его
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError('Токен доступа не предоставлен', 401);
    }

    // Проверяем токен
    const decoded = verifyToken(token);
    
    // Проверяем, существует ли пользователь в базе данных
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 401);
    }

    // Добавляем информацию о пользователе в объект запроса
    req.user = {
      userId: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Недействительный токен доступа'
    });
  }
};

/**
 * Опциональная аутентификация - не возвращает ошибку, если токен отсутствует
 * Используется для endpoints, которые работают как с авторизованными, так и с неавторизованными пользователями
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true }
      });

      if (user) {
        req.user = {
          userId: user.id,
          email: user.email
        };
      }
    }

    next();
  } catch (error) {
    // Игнорируем ошибки при опциональной аутентификации
    logger.debug('Optional auth failed, continuing without user:', error);
    next();
  }
};

/**
 * Middleware для проверки, является ли текущий пользователь владельцем ресурса
 * Используется для защиты ресурсов пользователей
 */
export const requireOwnership = (resourceUserField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentUserId = req.user?.userId;
    const resourceUserId = (req as any)[resourceUserField] || req.params.userId || req.body.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Необходима аутентификация'
      });
    }

    if (currentUserId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен: недостаточно прав'
      });
    }

    next();
  };
};

/**
 * Middleware для ограничения количества запросов (Rate Limiting)
 * Простая реализация в памяти - в продакшне лучше использовать Redis
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => { // 100 запросов за 15 минут по умолчанию
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.userId || req.ip || 'anonymous'; // используем userId для авторизованных пользователей, иначе IP
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      // Первый запрос или окно времени истекло
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Слишком много запросов. Попробуйте позже.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
};

/**
 * Middleware для проверки прав доступа к проекту
 * Проверяет, может ли пользователь получить доступ к проекту (владелец или публичный проект)
 */
export const checkProjectAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user?.userId;

    if (!projectId) {
      throw new AppError('ID проекта не указан', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, isPublic: true, shareToken: true }
    });

    if (!project) {
      throw new AppError('Проект не найден', 404);
    }

    // Владелец всегда имеет доступ
    if (project.userId === userId) {
      return next();
    }

    // Для публичных проектов разрешаем доступ
    if (project.isPublic) {
      return next();
    }

    // Доступ по токену share
    const shareToken = req.query.token || req.params.token;
    if (shareToken && project.shareToken === shareToken) {
      return next();
    }

    throw new AppError('Доступ к проекту запрещен', 403);

  } catch (error) {
    logger.error('Project access check error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Ошибка при проверке доступа к проекту'
    });
  }
};