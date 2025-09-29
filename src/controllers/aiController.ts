import { Request, Response } from 'express';
import * as aiService from '../services/aiService';
import { logger } from '../utils';

export const generateModel = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
            return;
        }

        logger.info('Processing model image generation...');
        
        const imageUrl = await aiService.generateModelImage(
            req.file.buffer,
            req.file.mimetype
        );

        res.json({
            success: true,
            imageUrl
        });

    } catch (error: any) {
        logger.error('Error in generateModel:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate model image'
        });
    }
};

export const virtualTryOn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { modelImageUrl } = req.body;
        const garmentFile = req.file;

        if (!modelImageUrl) {
            res.status(400).json({
                success: false,
                message: 'Model image URL is required'
            });
            return;
        }

        if (!garmentFile) {
            res.status(400).json({
                success: false,
                message: 'Garment image file is required'
            });
            return;
        }

        logger.info('Processing virtual try-on...');

        const imageUrl = await aiService.generateVirtualTryOnImage(
            modelImageUrl,
            garmentFile.buffer,
            garmentFile.mimetype
        );

        res.json({
            success: true,
            imageUrl
        });

    } catch (error: any) {
        logger.error('Error in virtualTryOn:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process virtual try-on'
        });
    }
};

export const generatePose = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageUrl, poseInstruction } = req.body;

        if (!imageUrl || !poseInstruction) {
            res.status(400).json({
                success: false,
                message: 'Image URL and pose instruction are required'
            });
            return;
        }

        logger.info(`Processing pose variation: ${poseInstruction}`);

        const generatedImageUrl = await aiService.generatePoseVariation(
            imageUrl,
            poseInstruction
        );

        res.json({
            success: true,
            imageUrl: generatedImageUrl
        });

    } catch (error: any) {
        logger.error('Error in generatePose:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate pose variation'
        });
    }
};

export const generateCloseup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageUrl, outfitDescription } = req.body;

        if (!imageUrl) {
            res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
            return;
        }

        logger.info('Processing closeup image generation...');

        const generatedImageUrl = await aiService.generateCloseupImage(
            imageUrl,
            outfitDescription || ''
        );

        res.json({
            success: true,
            imageUrl: generatedImageUrl
        });

    } catch (error: any) {
        logger.error('Error in generateCloseup:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate closeup image'
        });
    }
};

export const generatePostCopy = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageUrl, outfitDescription, sceneDescription, brandName } = req.body;

        if (!imageUrl) {
            res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
            return;
        }

        logger.info('Processing post copy generation...');

        const postCopy = await aiService.generatePostCopy(
            imageUrl,
            outfitDescription || '',
            sceneDescription || 'neutral studio background',
            brandName || ''
        );

        res.json({
            success: true,
            postCopy
        });

    } catch (error: any) {
        logger.error('Error in generatePostCopy:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate post copy'
        });
    }
};

export const generateVideo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageUrl, templateId } = req.body;

        if (!imageUrl) {
            res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
            return;
        }

        logger.info(`Processing video generation with template: ${templateId || 'runway-walk'}`);

        const operation = await aiService.startVideoGeneration(
            imageUrl,
            templateId || 'runway-walk'
        );

        res.json({
            success: true,
            operation: {
                id: operation.name || Date.now().toString(),
                status: 'processing'
            }
        });

    } catch (error: any) {
        logger.error('Error in generateVideo:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate video'
        });
    }
};

export const getVideoStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Operation ID is required'
            });
            return;
        }

        logger.info(`Checking video generation status for: ${id}`);

        const operation = { name: id };
        const status = await aiService.checkVideoGenerationStatus(operation);

        res.json({
            success: true,
            operation: status
        });

    } catch (error: any) {
        logger.error('Error in getVideoStatus:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check video status'
        });
    }
};
