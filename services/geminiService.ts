import { GenerationSettings } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function extractFirstInlineImageData(responseData: any): string {
  if (!responseData?.candidates?.length) {
    throw new Error('The model did not return any candidates.');
  }

  const candidate = responseData.candidates[0];
  const parts = candidate?.content?.parts;

  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part?.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  const textPart = Array.isArray(parts) ? parts.find((p) => p?.text) : null;
  if (textPart?.text) {
    throw new Error(`Generation refused (Text response): ${String(textPart.text).slice(0, 200)}...`);
  }

  throw new Error('No image data returned.');
}

async function parseJsonOrThrow(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (e) {
      throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
    }
  }

  const text = await response.text();
  throw new Error(`Server Error (${response.status}): ${text.slice(0, 200)}`);
}

/**
 * Generates an image by calling the backend Edge Function.
 */
export async function generateImageContent(
  prompt: string,
  referenceImagesBase64: string[],
  settings: GenerationSettings
): Promise<string> {
  
  try {
    const gatewayBaseUrl = (import.meta.env?.VITE_GEMINI_GATEWAY_URL as string | undefined)?.trim();

    if (gatewayBaseUrl) {
      const baseUrl = normalizeBaseUrl(gatewayBaseUrl);

      const parts: any[] = [];

      if (Array.isArray(referenceImagesBase64) && referenceImagesBase64.length > 0) {
        for (const refImg of referenceImagesBase64) {
          const matches = String(refImg).match(/^data:(.+);base64,(.+)$/);
          if (matches?.length === 3) {
            parts.push({
              inlineData: {
                mimeType: matches[1],
                data: matches[2],
              },
            });
          }
        }
      }

      parts.push({
        text: `[Strict Image Generation Mode]
Do not describe how to draw. Do not generate text.
Generate a high-quality image based on this prompt: ${prompt}`,
      });

      const requestBody = {
        contents: [{ parts }],
        generationConfig: { temperature: settings?.temperature ?? 1.0 },
      };

      const response = await fetch(`${baseUrl}/v1beta/models/${MODEL_NAME}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await parseJsonOrThrow(response);
      if (!response.ok) {
        const message = data?.error?.message || data?.error || `Server error: ${response.status}`;
        throw new Error(String(message));
      }

      return extractFirstInlineImageData(data);
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, referenceImagesBase64, settings }),
    });

    const data = await parseJsonOrThrow(response);
    if (!response.ok) {
      throw new Error(String(data?.error || `Server error: ${response.status}`));
    }

    if (!data?.imageData) {
      throw new Error('Server returned success but no image data.');
    }

    return data.imageData as string;

  } catch (error: any) {
    console.error("Gemini Image Generation Error (Edge):", error);
    throw error;
  }
}
