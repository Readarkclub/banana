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

    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.indexOf("application/json") !== -1) {
        try {
            data = await response.json();
        } catch (e) {
            console.error("Failed to parse JSON response:", e);
            throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
        }
    } else {
        // If not JSON, read text to give a hint (might be HTML error page)
        const text = await response.text();
        console.error("Server returned non-JSON response:", text.substring(0, 200)); // Log first 200 chars
        throw new Error(`Server Error (${response.status}): The server returned an unexpected response format. Please check if the backend is running.`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }
    
    if (!data.imageData) {
      throw new Error("Server returned success but no image data.");
    }

    return data.imageData;

  } catch (error: any) {
    console.error("Gemini Image Generation Error (Edge):", error);
    throw error;
  }
}