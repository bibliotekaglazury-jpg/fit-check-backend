import express from 'express';
import {
  getWardrobeItems,
  getWardrobeItem,
  addWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  getWardrobeStats
} from '../controllers/wardrobeController';
import { authenticateToken, rateLimit } from '../middleware/auth';
import { uploadSingle } from '../services/uploadService';
import {
  validateWardrobeItem,
  validatePagination,
  validateSearch,
  validateId
} from '../middleware/validation';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticateToken);

/**
 * @swagger
 * /api/wardrobe:
 *   get:
 *     tags:
 *       - Wardrobe
 *     summary: Получить все элементы гардероба пользователя
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Количество элементов на странице
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [TOP, BOTTOM, OUTERWEAR, DRESS, SHOES, ACCESSORIES, all]
 *         description: Фильтр по категории
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию или цвету
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Фильтр по тегам (через запятую)
 *     responses:
 *       200:
 *         description: Список элементов гардероба
 *       401:
 *         description: Не аутентифицирован
 */
router.get('/', validatePagination, validateSearch, getWardrobeItems);

/**
 * @swagger
 * /api/wardrobe/stats:
 *   get:
 *     tags:
 *       - Wardrobe
 *     summary: Получить статистику гардероба
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика гардероба пользователя
 *       401:
 *         description: Не аутентифицирован
 */
router.get('/stats', getWardrobeStats);

/**
 * @swagger
 * /api/wardrobe/{id}:
 *   get:
 *     tags:
 *       - Wardrobe
 *     summary: Получить конкретный элемент гардероба
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID элемента гардероба
 *     responses:
 *       200:
 *         description: Элемент гардероба
 *       404:
 *         description: Элемент не найден
 *       403:
 *         description: Доступ запрещен
 */
router.get('/:id', validateId(), getWardrobeItem);

/**
 * @swagger
 * /api/wardrobe:
 *   post:
 *     tags:
 *       - Wardrobe
 *     summary: Добавить новый элемент в гардероб
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название элемента одежды
 *               category:
 *                 type: string
 *                 enum: [TOP, BOTTOM, OUTERWEAR, DRESS, SHOES, ACCESSORIES]
 *                 description: Категория одежды
 *               color:
 *                 type: string
 *                 description: Цвет одежды
 *               tags:
 *                 type: string
 *                 description: JSON строка с массивом тегов
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Изображение элемента одежды
 *     responses:
 *       201:
 *         description: Элемент добавлен в гардероб
 *       400:
 *         description: Ошибка валидации данных
 */
router.post('/', 
  rateLimit(20, 60 * 60 * 1000), // 20 добавлений в час
  uploadSingle('image'),
  validateWardrobeItem,
  addWardrobeItem
);

/**
 * @swagger
 * /api/wardrobe/{id}:
 *   put:
 *     tags:
 *       - Wardrobe
 *     summary: Обновить элемент гардероба
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID элемента гардероба
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название элемента одежды
 *               category:
 *                 type: string
 *                 enum: [TOP, BOTTOM, OUTERWEAR, DRESS, SHOES, ACCESSORIES]
 *                 description: Категория одежды
 *               color:
 *                 type: string
 *                 description: Цвет одежды
 *               tags:
 *                 type: string
 *                 description: JSON строка с массивом тегов
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Новое изображение элемента одежды (опционально)
 *     responses:
 *       200:
 *         description: Элемент обновлен
 *       404:
 *         description: Элемент не найден
 *       403:
 *         description: Доступ запрещен
 */
router.put('/:id',
  validateId(),
  uploadSingle('image'),
  validateWardrobeItem,
  updateWardrobeItem
);

/**
 * @swagger
 * /api/wardrobe/{id}:
 *   delete:
 *     tags:
 *       - Wardrobe
 *     summary: Удалить элемент гардероба
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID элемента гардероба
 *     responses:
 *       200:
 *         description: Элемент удален
 *       404:
 *         description: Элемент не найден
 *       403:
 *         description: Доступ запрещен
 */
router.delete('/:id', validateId(), deleteWardrobeItem);

export default router;