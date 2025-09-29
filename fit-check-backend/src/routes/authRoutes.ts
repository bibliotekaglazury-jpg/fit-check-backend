import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword,
  deleteAccount 
} from '../controllers/authController';
import { authenticateToken, rateLimit } from '../middleware/auth';
import {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange
} from '../middleware/validation';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Регистрация нового пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Ошибка валидации данных
 *       409:
 *         description: Пользователь уже существует
 */
router.post('/register', rateLimit(5, 15 * 60 * 1000), validateUserRegistration, register); // 5 регистраций за 15 минут

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Вход в систему
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход в систему
 *       401:
 *         description: Неверные учетные данные
 */
router.post('/login', rateLimit(10, 15 * 60 * 1000), validateUserLogin, login); // 10 попыток входа за 15 минут

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Получить профиль текущего пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *       401:
 *         description: Не аутентифицирован
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Обновить профиль пользователя
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Профиль обновлен
 *       401:
 *         description: Не аутентифицирован
 */
router.put('/profile', authenticateToken, validateProfileUpdate, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Изменить пароль
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Пароль изменен
 *       401:
 *         description: Неверный текущий пароль
 */
router.put('/change-password', authenticateToken, rateLimit(3, 60 * 60 * 1000), validatePasswordChange, changePassword); // 3 смены пароля в час

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Удалить аккаунт
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Аккаунт удален
 *       401:
 *         description: Неверный пароль
 */
router.delete('/account', authenticateToken, rateLimit(2, 24 * 60 * 60 * 1000), deleteAccount); // 2 попытки удаления в день

export default router;