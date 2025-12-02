import { GenerationSettings } from "../types";

/**
 * Generates an image by calling the backend Edge Function.
 */
export async function generateImageContent(
  prompt: string,
  referenceImagesBase64: string[],
  settings: GenerationSettings
): Promise<string> {
  
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        referenceImagesBase64,
        settings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.imageData) {
      throw new Error("Server returned success but no image data.");
    }

    return data.imageData;

  } catch (error: any) {
    console.error("Gemini Image Generation Error (Edge):", error);
    throw error;
  }
}