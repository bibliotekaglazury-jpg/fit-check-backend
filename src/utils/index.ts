import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { JwtPayload } from '../types';

// JWT утилиты
export const generateToken = (payload: { userId: string; email: string }): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET не установлен в переменных окружения');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '7d', // токен действует 7 дней
  });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET не установлен в переменных окружения');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Недействительный токен');
  }
};

// Хеширование паролей
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // высокий уровень безопасности
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Генерация случайных токенов
export const generateShareToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateRandomString = (length: number = 16): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// Валидация email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Валидация пароля
export const isValidPassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать минимум одну заглавную букву');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать минимум одну строчную букву');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Пароль должен содержать минимум одну цифру');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Утилиты для работы с файлами
export const getAllowedImageTypes = (): string[] => {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
};

export const isValidImageFile = (file: Express.Multer.File): boolean => {
  const allowedTypes = getAllowedImageTypes();
  return allowedTypes.includes(file.mimetype);
};

export const getFileSize = (sizeInBytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (sizeInBytes === 0) return '0 Byte';
  const i = parseInt(String(Math.floor(Math.log(sizeInBytes) / Math.log(1024))));
  return Math.round(sizeInBytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Пагинация
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const getPaginationParams = (page?: string, limit?: string): PaginationOptions => {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '10', 10);
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(Math.max(1, limitNum), 100) // максимум 100 элементов на страницу
  };
};

export const createPaginatedResult = <T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> => {
  const totalPages = Math.ceil(total / options.limit);
  
  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1
    }
  };
};

// Обработка ошибок
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Произошла неожиданная ошибка';
};

// Логирование
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
};

// Очистка данных для публичных ответов API
export const sanitizeUser = (user: any) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};