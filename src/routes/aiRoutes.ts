import { Router } from 'express';
import multer from 'multer';
import * as aiController from '../controllers/aiController';

const router = Router();

// Настройка multer для обработки файлов в памяти
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB максимальный размер файла
    },
    fileFilter: (req, file, cb) => {
        // Разрешаем только изображения
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

// POST /api/ai/generate-model - генерация модели из загруженного фото
router.post('/generate-model', upload.single('image'), aiController.generateModel);

// POST /api/ai/virtual-tryon - виртуальная примерка одежды
router.post('/virtual-tryon', upload.single('garment'), aiController.virtualTryOn);

// POST /api/ai/generate-pose - генерация вариации позы
router.post('/generate-pose', aiController.generatePose);

// POST /api/ai/generate-closeup - генерация крупного плана
router.post('/generate-closeup', aiController.generateCloseup);

// POST /api/ai/generate-post-copy - генерация текста для поста
router.post('/generate-post-copy', aiController.generatePostCopy);

// POST /api/ai/generate-video - генерация видео (заглушка)
router.post('/generate-video', aiController.generateVideo);

// GET /api/ai/video-status/:id - проверка статуса генерации видео (заглушка)
router.get('/video-status/:id', aiController.getVideoStatus);

export default router;