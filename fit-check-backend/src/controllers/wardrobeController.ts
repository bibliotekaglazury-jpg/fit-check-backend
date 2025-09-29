import { Request, Response } from 'express';
import { WardrobeCategory } from '@prisma/client';
import prisma from '../utils/database';
import { AppError } from '../types';
import { 
  logger, 
  getPaginationParams, 
  createPaginatedResult,
  getErrorMessage 
} from '../utils';
import { 
  uploadImageToCloudinary, 
  deleteImageFromCloudinary,
  CLOUDINARY_FOLDERS,
  IMAGE_TRANSFORMATIONS 
} from '../services/uploadService';

/**
 * Получить все элементы гардероба пользователя
 * GET /api/wardrobe
 */
export const getWardrobeItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    const { page, limit } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    // Фильтры
    const { category, search, tags } = req.query;
    
    const where: any = { userId };

    if (category && category !== 'all') {
      where.category = category as WardrobeCategory;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { color: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (tags) {
      const tagsArray = (tags as string).split(',').map(tag => tag.trim());
      where.tags = {
        hasSome: tagsArray
      };
    }

    // Получаем общее количество для пагинации
    const total = await prisma.wardrobeItem.count({ where });

    // Получаем элементы гардероба с пагинацией
    const wardrobeItems = await prisma.wardrobeItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const paginatedResult = createPaginatedResult(wardrobeItems, total, { page, limit });

    res.json({
      success: true,
      message: 'Гардероб успешно получен',
      data: paginatedResult
    });

  } catch (error) {
    logger.error('Get wardrobe items error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при получении гардероба'
    });
  }
};

/**
 * Получить конкретный элемент гардероба
 * GET /api/wardrobe/:id
 */
export const getWardrobeItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    const wardrobeItem = await prisma.wardrobeItem.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!wardrobeItem) {
      throw new AppError('Элемент гардероба не найден', 404);
    }

    // Проверяем, принадлежит ли элемент пользователю
    if (wardrobeItem.userId !== userId) {
      throw new AppError('Доступ запрещен', 403);
    }

    res.json({
      success: true,
      message: 'Элемент гардероба получен',
      data: wardrobeItem
    });

  } catch (error) {
    logger.error('Get wardrobe item error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при получении элемента гардероба'
    });
  }
};

/**
 * Добавить новый элемент в гардероб
 * POST /api/wardrobe
 */
export const addWardrobeItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    const { name, category, color, tags } = req.body;
    const imageFile = req.file;

    // Валидация входных данных
    if (!name || !category || !imageFile) {
      throw new AppError('Название, категория и изображение обязательны', 400);
    }

    // Проверяем валидность категории
    const validCategories = Object.values(WardrobeCategory);
    if (!validCategories.includes(category)) {
      throw new AppError(`Недопустимая категория. Разрешенные: ${validCategories.join(', ')}`, 400);
    }

    // Загружаем изображение в Cloudinary
    const uploadedImage = await uploadImageToCloudinary(
      imageFile,
      CLOUDINARY_FOLDERS.WARDROBE,
      IMAGE_TRANSFORMATIONS.WARDROBE_ITEM
    );

    // Парсим теги
    let parsedTags: string[] = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Создаем элемент гардероба
    const wardrobeItem = await prisma.wardrobeItem.create({
      data: {
        name: name.trim(),
        category: category as WardrobeCategory,
        color: color ? color.trim() : null,
        tags: parsedTags,
        imageUrl: uploadedImage.url,
        userId
      }
    });

    logger.info(`Wardrobe item created: ${wardrobeItem.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Элемент успешно добавлен в гардероб',
      data: wardrobeItem
    });

  } catch (error) {
    logger.error('Add wardrobe item error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении элемента в гардероб'
    });
  }
};

/**
 * Обновить элемент гардероба
 * PUT /api/wardrobe/:id
 */
export const updateWardrobeItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    // Проверяем, существует ли элемент и принадлежит ли он пользователю
    const existingItem = await prisma.wardrobeItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      throw new AppError('Элемент гардероба не найден', 404);
    }

    if (existingItem.userId !== userId) {
      throw new AppError('Доступ запрещен', 403);
    }

    const { name, category, color, tags } = req.body;
    const imageFile = req.file;

    // Подготавливаем данные для обновления
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (category !== undefined) {
      const validCategories = Object.values(WardrobeCategory);
      if (!validCategories.includes(category)) {
        throw new AppError(`Недопустимая категория. Разрешенные: ${validCategories.join(', ')}`, 400);
      }
      updateData.category = category as WardrobeCategory;
    }

    if (color !== undefined) {
      updateData.color = color ? color.trim() : null;
    }

    if (tags !== undefined) {
      updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Если загружается новое изображение
    if (imageFile) {
      // Удаляем старое изображение из Cloudinary (извлекаем public_id из URL)
      const oldImageUrl = existingItem.imageUrl;
      if (oldImageUrl) {
        try {
          const publicId = oldImageUrl.split('/').pop()?.split('.')[0];
          if (publicId) {
            await deleteImageFromCloudinary(`${CLOUDINARY_FOLDERS.WARDROBE}/${publicId}`);
          }
        } catch (deleteError) {
          logger.warn('Failed to delete old image from Cloudinary:', deleteError);
        }
      }

      // Загружаем новое изображение
      const uploadedImage = await uploadImageToCloudinary(
        imageFile,
        CLOUDINARY_FOLDERS.WARDROBE,
        IMAGE_TRANSFORMATIONS.WARDROBE_ITEM
      );

      updateData.imageUrl = uploadedImage.url;
    }

    // Обновляем элемент
    const updatedItem = await prisma.wardrobeItem.update({
      where: { id },
      data: updateData
    });

    logger.info(`Wardrobe item updated: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Элемент гардероба успешно обновлен',
      data: updatedItem
    });

  } catch (error) {
    logger.error('Update wardrobe item error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении элемента гардероба'
    });
  }
};

/**
 * Удалить элемент гардероба
 * DELETE /api/wardrobe/:id
 */
export const deleteWardrobeItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    // Проверяем, существует ли элемент и принадлежит ли он пользователю
    const existingItem = await prisma.wardrobeItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      throw new AppError('Элемент гардероба не найден', 404);
    }

    if (existingItem.userId !== userId) {
      throw new AppError('Доступ запрещен', 403);
    }

    // Удаляем изображение из Cloudinary
    if (existingItem.imageUrl) {
      try {
        const publicId = existingItem.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await deleteImageFromCloudinary(`${CLOUDINARY_FOLDERS.WARDROBE}/${publicId}`);
        }
      } catch (deleteError) {
        logger.warn('Failed to delete image from Cloudinary:', deleteError);
        // Продолжаем удаление элемента даже если не удалось удалить изображение
      }
    }

    // Удаляем элемент из базы данных
    await prisma.wardrobeItem.delete({
      where: { id }
    });

    logger.info(`Wardrobe item deleted: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Элемент гардероба успешно удален'
    });

  } catch (error) {
    logger.error('Delete wardrobe item error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении элемента гардероба'
    });
  }
};

/**
 * Получить статистику гардероба пользователя
 * GET /api/wardrobe/stats
 */
export const getWardrobeStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }

    // Получаем общее количество элементов
    const totalItems = await prisma.wardrobeItem.count({
      where: { userId }
    });

    // Получаем статистику по категориям
    const categoryStats = await prisma.wardrobeItem.groupBy({
      by: ['category'],
      where: { userId },
      _count: {
        category: true
      }
    });

    // Получаем топ тегов
    const allTags = await prisma.wardrobeItem.findMany({
      where: { userId },
      select: { tags: true }
    });

    const tagCounts: { [key: string]: number } = {};
    allTags.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      message: 'Статистика гардероба получена',
      data: {
        totalItems,
        categoryStats: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category
        })),
        topTags
      }
    });

  } catch (error) {
    logger.error('Get wardrobe stats error:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики гардероба'
    });
  }
};