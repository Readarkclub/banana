import { GenerationSettings } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';

// API configuration
const API_BASE = process.env.GEMINI_GATEWAY_URL || 'https://generativelanguage.googleapis.com';
const API_KEY = process.env.API_KEY || '';

// Request timeout (2 minutes for image generation)
const REQUEST_TIMEOUT = 120000;

/**
 * Ensures the user has selected a paid API key for the Pro model (AI Studio only).
 */
async function ensureApiKey() {
  if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
}

/**
 * Creates a fetch request with timeout support.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again with a simpler prompt.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates an image based on prompt and optional reference images.
 * Uses native fetch for better mobile browser compatibility.
 */
export async function generateImageContent(
  prompt: string,
  referenceImages: string[],
  settings: GenerationSettings
): Promise<string> {

  await ensureApiKey();

  // Build content parts
  const parts: any[] = [];

  // Add reference images if provided
  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach((img) => {
      const matches = img.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2],
          },
        });
      }
    });
  }

  // Add text prompt
  parts.push({ text: prompt });

  // Build generation config
  const generationConfig: any = {
    responseModalities: ["IMAGE"],
    temperature: settings.temperature,
  };

  // Add image size
  if (settings.resolution) {
    generationConfig.imageSize = settings.resolution;
  }

  // Add aspect ratio (skip if Auto)
  if (settings.aspectRatio && settings.aspectRatio !== 'Auto') {
    generationConfig.aspectRatio = settings.aspectRatio;
  }

  // Build request body
  const requestBody = {
    contents: [{ parts }],
    generationConfig,
  };

  // Build URL with API key
  const url = `${API_BASE}/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      REQUEST_TIMEOUT
    );

    // Parse response
    const data = await response.json();

    // Check for API errors
    if (data.error) {
      const errorMsg = data.error.message || 'Unknown API error';
      console.error('Gemini API Error:', data.error);
      throw new Error(`API Error: ${errorMsg}`);
    }

    // Check for candidates
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('The model did not return any candidates. The request might have been blocked.');
    }

    const candidate = data.candidates[0];

    // Check for safety block
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Generation was blocked by safety settings. Please try modifying your prompt.');
    }

    if (candidate.finishReason === 'IMAGE_SAFETY') {
      throw new Error('Generation was blocked by image safety filters. Please try a different prompt.');
    }

    if (candidate.finishReason === 'IMAGE_OTHER') {
      throw new Error('Generation was blocked by content filters. Please try a different prompt.');
    }

    // Check for other non-success finish reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Generation failed with reason: ${candidate.finishReason}`);
    }

    // Find image in response
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    // Check for text explanation
    const textPart = candidate.content?.parts?.find((p: any) => p.text);
    if (textPart && textPart.text) {
      throw new Error(`Generation refused: ${textPart.text}`);
    }

    throw new Error('The model received the request but did not return an image.');

  } catch (error: any) {
    console.error('Gemini Image Generation Error:', error);

    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      throw new Error('Request timeout. Image generation is taking too long. Please try again.');
    }

    throw error;
  }
}
