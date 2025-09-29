import { v2 as cloudinary } from 'cloudinary';
import { UploadedFile } from '../types';
import { logger } from '../utils';
import multer from 'multer';
import { Request } from 'express';

// Настройка Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Настройка multer для загрузки файлов в память
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Разрешенные типы файлов
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}. Разрешены: JPEG, PNG, WebP`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимальный размер файла
  },
});

/**
 * Загружает изображение в Cloudinary
 * @param file - файл для загрузки
 * @param folder - папка в Cloudinary для организации файлов
 * @param transformation - опциональные трансформации изображения
 * @returns Promise<UploadedFile>
 */
export const uploadImageToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'fit-check',
  transformation?: any
): Promise<UploadedFile> => {
  try {
    logger.info(`Uploading image to Cloudinary: ${file.originalname}`);

    const uploadOptions: any = {
      folder,
      resource_type: 'auto',
      quality: 'auto:good', // автоматическая оптимизация качества
      fetch_format: 'auto', // автоматический выбор формата (WebP для поддерживающих браузеров)
    };

    // Применяем трансформации если указаны
    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    // Загружаем файл как base64 данные
    const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Data, uploadOptions);

    logger.info(`Image uploaded successfully: ${result.public_id}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      originalName: file.originalname,
      size: result.bytes,
      mimetype: file.mimetype,
    };

  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error(`Ошибка при загрузке изображения: ${error}`);
  }
};

/**
 * Загружает множественные изображения в Cloudinary
 */
export const uploadMultipleImages = async (
  files: Express.Multer.File[],
  folder: string = 'fit-check'
): Promise<UploadedFile[]> => {
  const uploadPromises = files.map(file => uploadImageToCloudinary(file, folder));
  return Promise.all(uploadPromises);
};

/**
 * Удаляет изображение из Cloudinary
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    logger.info(`Deleting image from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      throw new Error(`Failed to delete image: ${result.result}`);
    }

    logger.info(`Image deleted successfully: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error(`Ошибка при удалении изображения: ${error}`);
  }
};

/**
 * Получает информацию об изображении из Cloudinary
 */
export const getImageInfo = async (publicId: string) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    logger.error('Cloudinary get image info error:', error);
    throw new Error(`Ошибка при получении информации об изображении: ${error}`);
  }
};

/**
 * Создает трансформированную версию изображения (например, миниатюру)
 */
export const createImageThumbnail = (publicId: string, width: number = 300, height: number = 300): string => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto'
  });
};

/**
 * Специальные папки для разных типов изображений
 */
export const CLOUDINARY_FOLDERS = {
  USERS: 'fit-check/users',
  WARDROBE: 'fit-check/wardrobe',
  MODELS: 'fit-check/models', 
  GENERATIONS: 'fit-check/generations',
  BACKGROUNDS: 'fit-check/backgrounds',
} as const;

/**
 * Предустановленные трансформации для разных целей
 */
export const IMAGE_TRANSFORMATIONS = {
  // Для пользовательских аватаров
  AVATAR: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good'
  },
  
  // Для элементов гардероба
  WARDROBE_ITEM: {
    width: 800,
    height: 800,
    crop: 'fit',
    quality: 'auto:good',
    background: 'white'
  },
  
  // Для моделей (фотографии людей)
  MODEL: {
    width: 1024,
    height: 1024,
    crop: 'fit',
    quality: 'auto:good'
  },
  
  // Для сгенерированных изображений
  GENERATION: {
    width: 1024,
    height: 1024,
    crop: 'fit',
    quality: 'auto:best'
  }
} as const;

/**
 * Middleware для обработки загрузки одного файла
 */
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

/**
 * Middleware для обработки загрузки нескольких файлов
 */
export const uploadMultiple = (fieldName: string, maxCount: number = 10) => 
  upload.array(fieldName, maxCount);

/**
 * Middleware для обработки загрузки файлов с разными именами полей
 */
export const uploadFields = (fields: { name: string; maxCount: number }[]) => 
  upload.fields(fields);