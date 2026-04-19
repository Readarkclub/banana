import { GenerationSettings, GenerationResponse, RateLimitInfo } from "../types";

const MODEL_NAME = 'gemini-3.1-flash-image-preview';

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
  const url = response.url || '';
  const isApiGenerate = url.includes('/api/generate');
  const looksLikeNotFound = /The page could not be found|NOT_FOUND/i.test(text);
  if (response.status === 404 && isApiGenerate && looksLikeNotFound) {
    throw new Error(
      [
        'API endpoint `/api/generate` returned 404 (not found).',
        'This usually means the backend endpoint is not running or not deployed.',
        '',
        'Local dev: run `npm run pages:dev` and open the Wrangler URL (usually `http://127.0.0.1:8788`), not the Vite port.',
        'Vercel deploy: ensure the project exposes `/api/generate` and has server-side env vars configured.',
        'Do not rely on browser-side `VITE_*` secrets for production requests.',
      ].join('\n')
    );
  }
  throw new Error(`Server Error (${response.status}): ${text.slice(0, 200)}`);
}

/**
 * Generates an image by calling the backend Edge Function.
 * Returns image data and rate limit information.
 */
export async function generateImageContent(
  prompt: string,
  referenceImagesBase64: string[],
  settings: GenerationSettings
): Promise<GenerationResponse> {

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, referenceImagesBase64, settings }),
    });

    const data = await parseJsonOrThrow(response);
    if (!response.ok) {
      // Check for rate limit error
      if (data?.errorCode === 'RATE_LIMIT_EXCEEDED') {
        const error = new Error(String(data?.error || '每日请求次数已达上限'));
        (error as any).isRateLimitError = true;
        (error as any).dailyLimit = data?.dailyLimit;
        (error as any).resetTime = data?.resetTime;
        throw error;
      }
      throw new Error(String(data?.error || `Server error: ${response.status}`));
    }

    if (!data?.imageData) {
      throw new Error('Server returned success but no image data.');
    }

    return {
      imageData: data.imageData as string,
      rateLimit: data.rateLimit as RateLimitInfo | undefined
    };

  } catch (error: any) {
    console.error("Gemini Image Generation Error (Edge):", error);
    throw error;
  }
}
