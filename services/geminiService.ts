import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview'; // Nano Banana Pro / Gemini Pro Image

// Get custom API endpoint from environment (for Cloudflare proxy, etc.)
const GATEWAY_URL = process.env.GEMINI_GATEWAY_URL;

/**
 * Ensures the user has selected a paid API key for the Pro model.
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
 * Generates an image based on prompt and optional reference images.
 */
export async function generateImageContent(
  prompt: string,
  referenceImages: string[],
  settings: GenerationSettings
): Promise<string> {
  
  await ensureApiKey();

  // Create a new instance with custom endpoint if configured
  const aiConfig: any = { apiKey: process.env.API_KEY };
  if (GATEWAY_URL) {
    aiConfig.httpOptions = { baseUrl: GATEWAY_URL };
  }
  const ai = new GoogleGenAI(aiConfig);

  const parts: any[] = [];

  // If there are reference images, add them.
  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach((img) => {
      // Extract base64 data and mimeType (basic detection)
      // Assumes format "data:image/xyz;base64,..."
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

  // Add the text prompt
  parts.push({ text: prompt });

  // Construct imageConfig, omitting aspectRatio if set to 'Auto'
  const imageConfig: any = {
    imageSize: settings.resolution,
  };
  if (settings.aspectRatio !== 'Auto') {
    imageConfig.aspectRatio = settings.aspectRatio;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: ["IMAGE"],
        temperature: settings.temperature,
        ...imageConfig,
      },
    });

    // Check for candidates
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("The model did not return any candidates. The request might have been blocked.");
    }

    const candidate = response.candidates[0];

    // Check for safety block or other finish reasons explicitly
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("Generation was blocked by safety settings. Please try modifying your prompt or reference image.");
    }
    
    if (candidate.finishReason === 'IMAGE_OTHER') {
        throw new Error("Generation was blocked by content filters (IMAGE_OTHER). Please try a different prompt or reference image.");
    }

    // Check for other non-success finish reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Generation failed with reason: ${candidate.finishReason}`);
    }

    // Iterate to find the image part
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    // Fallback if no image found but no explicit safety error in finishReason
    // Sometimes text part explains why:
    const textPart = candidate.content?.parts?.find(p => p.text);
    if (textPart && textPart.text) {
        throw new Error(`Generation refused: ${textPart.text}`);
    }
    
    // Catch-all for silent failures which are usually safety-related on this model
    throw new Error("The model received the request but did not return an image. This usually indicates a safety refusal for the specific prompt or reference image.");

  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    // If the error suggests the key is missing or invalid (entity not found often maps to this in the studio environment), try to prompt again on next retry, or throw specific error.
    if (error.message && error.message.includes("Requested entity was not found")) {
        // Reset key selection implicitly by throwing a specific error the UI can handle,
        // or just let the user try again which triggers ensureApiKey.
        throw new Error("API Key issue or Model not found. Please try again or select a new key.");
    }
    throw error;
  }
}