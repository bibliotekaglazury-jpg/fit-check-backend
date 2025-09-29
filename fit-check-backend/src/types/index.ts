import { User as PrismaUser, WardrobeItem, Project, Generation } from '@prisma/client';

// Базовые типы API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Пользователь без пароля для публичных ответов API
export interface PublicUser extends Omit<PrismaUser, 'password'> {}

// Типы для аутентификации
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Типы для гардероба
export interface CreateWardrobeItemData {
  name: string;
  category: string;
  color?: string;
  tags?: string[];
  imageFile: Express.Multer.File;
}

export interface UpdateWardrobeItemData {
  name?: string;
  category?: string;
  color?: string;
  tags?: string[];
}

// Типы для проектов
export interface CreateProjectData {
  name: string;
  description?: string;
  modelImageFile: Express.Multer.File;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

// Типы для генерации изображений
export interface GenerationRequest {
  type: 'MODEL_EXTRACTION' | 'VIRTUAL_TRYON' | 'POSE_CHANGE' | 'BACKGROUND_CHANGE' | 'VIDEO_GENERATION' | 'CLOSEUP' | 'CAROUSEL';
  projectId?: string;
  inputImageUrl: string;
  garmentImageFile?: Express.Multer.File;
  prompt?: string;
  pose?: string;
  metadata?: any;
}

export interface GenerationResult {
  id: string;
  type: string;
  outputImageUrl: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  metadata?: any;
}

// Расширенные типы с отношениями
export interface WardrobeItemWithUser extends WardrobeItem {
  user: PublicUser;
}

export interface ProjectWithDetails extends Project {
  user: PublicUser;
  items: Array<{
    id: string;
    order: number;
    wardrobeItem: WardrobeItem;
  }>;
  generations: Generation[];
}

export interface GenerationWithDetails extends Generation {
  user: PublicUser;
  project?: Project;
}

// Типы для файлов
export interface UploadedFile {
  url: string;
  publicId: string;
  originalName: string;
  size: number;
  mimetype: string;
}

// Middleware типы
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Типы для фонов
export interface BackgroundData {
  name: string;
  description?: string;
  category: string;
  tags: string[];
  imageFile: Express.Multer.File;
}

// Типы для Instagram карусели
export interface CarouselRequest {
  projectId: string;
  poses?: string[];
  includeCloseup?: boolean;
}

// Ошибки
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Константы
export const POSE_INSTRUCTIONS = [
  'Full frontal view, hands on hips',
  'Slightly turned, 3/4 view',
  'Side profile view',
  'Jumping in the air, mid-action shot',
  'Walking towards camera',
  'Leaning against a wall',
] as const;

export const WARDROBE_CATEGORIES = [
  'TOP',
  'BOTTOM',
  'OUTERWEAR', 
  'DRESS',
  'SHOES',
  'ACCESSORIES'
] as const;

export const GENERATION_TYPES = [
  'MODEL_EXTRACTION',
  'VIRTUAL_TRYON',
  'POSE_CHANGE',
  'BACKGROUND_CHANGE',
  'VIDEO_GENERATION',
  'CLOSEUP',
  'CAROUSEL'
] as const;