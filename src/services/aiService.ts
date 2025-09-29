import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const model = 'gemini-2.5-flash-image-preview';
const videoModel = 'veo-3.0-generate-001';

// Утилита для конвертации файлов
const fileToPart = (buffer: Buffer, mimeType: string) => {
    const data = buffer.toString('base64');
    return { inlineData: { mimeType, data } };
};

const dataUrlToPart = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { inlineData: { mimeType: mimeMatch[1], data: arr[1] } };
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

export const generateModelImage = async (imageBuffer: Buffer, mimeType: string): Promise<string> => {
    const userImagePart = fileToPart(imageBuffer, mimeType);
    const prompt = `You are an expert AI fashion photographer. Your task is to take the person from the provided image and place them in a professional e-commerce fashion photo.

**ULTIMATE COMMAND: PRESERVE THE ORIGINAL FACE. THIS IS A STRICT, NON-NEGOTIABLE RULE. DO NOT CHANGE THE FACE.**

**PRIMARY DIRECTIVE: The person's facial features, structure, and identity MUST be 100% preserved from the original photo. Any alteration to the face, however minor, is a complete failure of the task. The face in the output image must be IDENTICAL to the face in the input image.**

**SECONDARY INSTRUCTIONS:**
1.  **PRESERVE BODY TYPE:** The person's body type must be maintained.
2.  **POSE & BACKGROUND:** Place the person in a standard, relaxed standing model pose against a clean, neutral studio backdrop (light gray, #f0f0f0). If the original image is not full-body, generate a realistic full-body view that is consistent with the person shown.
3.  **OUTPUT:** The final image must be photorealistic. Return ONLY the final image.

**FINAL CHECK: Did you alter the face? If so, you have failed. Discard the result and start again, this time PRESERVING THE FACE EXACTLY as commanded.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, userImagePart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentBuffer: Buffer, garmentMimeType: string): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = fileToPart(garmentBuffer, garmentMimeType);
    
    const prompt = `You are an expert virtual try-on AI. Your task is to perform a garment **REPLACEMENT**. You will receive a 'model image' and a 'garment image'. You must create a new image where the person from the 'model image' is wearing the garment from the 'garment image'.

**ULTIMATE COMMAND: This is a REPLACEMENT, not a layering operation. You MUST first virtually REMOVE ALL existing clothing from the person in the 'model image'. The person should be undressed before you apply the new garment. Any part of the original clothing (collars, sleeves, etc.) showing in the final image is a critical failure.**

**Step-by-step process:**
1.  **Analyze Model:** Look at the person in the 'model image'.
2.  **Undress Model:** Virtually remove ALL clothing items they are wearing, leaving only the person.
3.  **Dress Model:** Realistically place the new garment from the 'garment image' onto the now-undressed person.

**Rules for the final image:**
*   **PRESERVE THE MODEL:** The person's face, hair, body shape, and pose from the 'model image' MUST remain identical.
*   **PRESERVE THE BACKGROUND:** The background from the 'model image' MUST be preserved perfectly.
*   **REALISTIC FIT:** The new garment must fit the person's body and pose naturally, with correct lighting and shadows that match the original image.
*   **OUTPUT:** Return ONLY the final, edited image. Do not include any text.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, modelImagePart, garmentImagePart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (imageUrl: string, poseInstruction: string): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    const prompt = `Create a professional fashion photography variation of the provided image with a different camera angle.

**Technical Requirements:**
- Maintain exact same dimensions and aspect ratio
- Preserve the person's appearance, clothing, and background
- Apply new camera perspective: "${poseInstruction}"
- Professional fashion photography quality
- Return only the final image`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateCloseupImage = async (imageUrl: string, outfitDescription: string): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    const clothingFocus = outfitDescription ? `Highlight clothing details: ${outfitDescription}` : 'Highlight garment details';

    const prompt = `Create a professional close-up fashion photograph from the provided image.

**Requirements:**
- Same dimensions and aspect ratio as source
- Close-up view (waist up or detail shot)
- ${clothingFocus}
- Showcase fabric texture and craftsmanship
- Professional fashion photography quality
- Return only the final image`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePostCopy = async (
    imageUrl: string, 
    outfitDescription: string, 
    sceneDescription: string,
    brandName: string
): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    
    const outfitText = outfitDescription ? `The outfit consists of: ${outfitDescription}.` : "The person is wearing the displayed outfit.";
    const sceneText = `The scene is: ${sceneDescription}.`;
    const brandText = brandName 
        ? `The fashion brand is "${brandName}". Mention the brand name at least once in a natural way.` 
        : `No brand name was provided. Do not invent a brand name.`;

    const prompt = `You are an expert social media marketer and copywriter for a trendy e-commerce fashion brand.
Based on the provided image, the outfit, and the scene, write an engaging Instagram post caption. Use relevant emojis to make the post more visually appealing.

The caption MUST include these three sections in order:
1.  **Product Description:** A captivating description of the outfit (2-3 sentences). Focus on the style, material, and how it makes the wearer feel.
2.  **Call to Action (CTA):** A clear and compelling call to action (1 sentence). Encourage users to shop, learn more, or comment.
3.  **Hashtags:** A list of 5-7 relevant and trending hashtags.

**Outfit Details:** ${outfitText}
**Scene Details:** ${sceneText}
**Brand Details:** ${brandText}

Generate ONLY the caption text, without any introductory phrases like "Here's the caption:".`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });

    let postCopy = response.text;

    if (!postCopy) {
        if (response.promptFeedback?.blockReason) {
            const { blockReason, blockReasonMessage } = response.promptFeedback;
            const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
            throw new Error(errorMessage);
        }
        throw new Error("The model did not return a post copy. This could be due to safety filters or a temporary issue.");
    }

    // Clean up potential introductory phrases from the model's response.
    postCopy = postCopy.replace(/^.*:\s*\n*/, '').trim();
    
    return postCopy;
};

// Утилиты для видео
const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
};

// Видео шаблоны (упрощенная версия)
const getVideoTemplate = (templateId: string) => {
    const templates: Record<string, any> = {
        'runway-walk': {
            prompt: 'Create a smooth runway walk animation with the model walking confidently towards the camera',
            duration: 3,
            motionStrength: 'medium'
        },
        'pose-variation': {
            prompt: 'Create a subtle pose variation with gentle movement and camera zoom',
            duration: 2,
            motionStrength: 'low'
        },
        'fashion-showcase': {
            prompt: 'Create a fashion showcase animation with outfit details highlighted',
            duration: 4,
            motionStrength: 'high'
        }
    };
    return templates[templateId] || templates['runway-walk'];
};

export const startVideoGeneration = async (imageUrl: string, templateId: string = 'runway-walk'): Promise<any> => {
    const { data: imageBytes, mimeType } = dataUrlToParts(imageUrl);
    const template = getVideoTemplate(templateId);
    
    const operation = await ai.models.generateVideos({
        model: videoModel,
        prompt: template.prompt,
        image: { imageBytes: Buffer.from(imageBytes, 'base64'), mimeType },
        config: { 
            numberOfVideos: 1,
            videoLength: template.duration,
            aspectRatio: '9:16', // Vertical Instagram format
            motionStrength: template.motionStrength,
            quality: 'premium',
            cropMode: 'smart',
            scaleMode: 'fill'
        }
    });
    
    return operation;
};

export const checkVideoGenerationStatus = async (operation: any): Promise<any> => {
    return await ai.operations.getVideosOperation({ operation });
};
