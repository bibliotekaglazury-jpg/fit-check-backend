import { Request, Response } from 'express';
import { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  isValidEmail, 
  isValidPassword,
  sanitizeUser,
  logger 
} from '../utils';
import { AppError } from '../types';
import prisma from '../utils/database';

/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      throw new AppError('Email и пароль обязательны', 400);
    }

    if (!isValidEmail(email)) {
      throw new AppError('Неверный формат email', 400);
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.isValid) {
      throw new AppError(`Пароль не соответствует требованиям: ${passwordValidation.errors.join(', ')}`, 400);
    }

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким email уже существует', 409);
    }

    // Хешируем пароль
    const hashedPassword = await hashPassword(password);

    // Создаем нового пользователя
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null
      }
    });

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user: sanitizeUser(user),
        accessToken: token
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при регистрации'
    });
  }
};

/**
 * Вход в систему
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      throw new AppError('Email и пароль обязательны', 400);
    }

    if (!isValidEmail(email)) {
      throw new AppError('Неверный формат email', 400);
    }

    // Находим пользователя по email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new AppError('Неверный email или пароль', 401);
    }

    // Проверяем пароль
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new AppError('Неверный email или пароль', 401);
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Успешный вход в систему',
      data: {
        user: sanitizeUser(user),
        accessToken: token
      }
    });

  } catch (error) {
    logger.error('Login error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при входе'
    });
  }
};

/**
 * Получение профиля текущего пользователя
 * GET /api/auth/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            projects: true,
            wardrobes: true,
            generations: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    res.json({
      success: true,
      message: 'Профиль пользователя получен',
      data: {
        user: sanitizeUser(user),
        stats: user._count
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при получении профиля'
    });
  }
};

/**
 * Обновление профиля пользователя
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, avatar } = req.body;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('Нет данных для обновления', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      data: {
        user: sanitizeUser(user)
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении профиля'
    });
  }
};

/**
 * Смена пароля
 * PUT /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    if (!currentPassword || !newPassword) {
      throw new AppError('Текущий и новый пароль обязательны', 400);
    }

    // Валидируем новый пароль
    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(`Новый пароль не соответствует требованиям: ${passwordValidation.errors.join(', ')}`, 400);
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Проверяем текущий пароль
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw new AppError('Неверный текущий пароль', 401);
    }

    // Хешируем новый пароль
    const hashedNewPassword = await hashPassword(newPassword);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });

  } catch (error) {
    logger.error('Change password error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при смене пароля'
    });
  }
};

/**
 * Удаление аккаунта
 * DELETE /api/auth/account
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    if (!password) {
      throw new AppError('Пароль обязателен для удаления аккаунта', 400);
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Проверяем пароль
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new AppError('Неверный пароль', 401);
    }

    // Удаляем пользователя (каскадное удаление удалит все связанные данные)
    await prisma.user.delete({
      where: { id: userId }
    });

    logger.info(`User account deleted: ${user.email}`);

    res.json({
      success: true,
      message: 'Аккаунт успешно удален'
    });

  } catch (error) {
    logger.error('Delete account error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении аккаунта'
    });
  }
};