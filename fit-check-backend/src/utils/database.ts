import { PrismaClient } from '@prisma/client';

// Создаем единственный экземпляр Prisma клиента
// Это важно для производительности - не создаем множественные подключения
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'], // логирование SQL запросов для отладки
});

// Функция для безопасного подключения к базе данных
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('🔗 Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Функция для безопасного отключения от базы данных
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected successfully');
  } catch (error) {
    console.error('❌ Failed to disconnect from database:', error);
  }
};

// Обработчик завершения процесса
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export default prisma;