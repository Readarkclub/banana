import { GenerationSettings, GenerationResponse, RateLimitInfo } from "../types";

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
  const url = response.url || '';
  const isApiGenerate = url.includes('/api/generate');
  const looksLikeNotFound = /The page could not be found|NOT_FOUND/i.test(text);
  if (response.status === 404 && isApiGenerate && looksLikeNotFound) {
    throw new Error(
      [
        'API endpoint `/api/generate` returned 404 (not found).',
        'This usually means the backend (Cloudflare Pages Functions) is not running or not deployed.',
        '',
        'Local dev: run `npm run pages:dev` and open the Wrangler URL (usually `http://127.0.0.1:8788`), not the Vite port.',
        'Frontend-only deploy: set `VITE_GEMINI_GATEWAY_URL` to your Worker gateway base URL (e.g. `https://readark.club/api`).',
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

      const apiSecretKey = (import.meta.env?.VITE_API_SECRET_KEY as string | undefined)?.trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiSecretKey) {
        headers['Authorization'] = `Bearer ${apiSecretKey}`;
      }

      const response = await fetch(`${baseUrl}/v1beta/models/${MODEL_NAME}:generateContent`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await parseJsonOrThrow(response);
      if (!response.ok) {
        // Check for rate limit error from Gateway
        if (response.status === 429 || data?.error?.status === 'RATE_LIMIT_EXCEEDED') {
          const error = new Error(data?.error?.message || 'Daily request limit reached');
          (error as any).isRateLimitError = true;
          (error as any).dailyLimit = data?.rateLimit?.limit || 60;
          (error as any).resetTime = data?.rateLimit?.resetTime || 'UTC 00:00';
          throw error;
        }
        const message = data?.error?.message || data?.error || `Server error: ${response.status}`;
        throw new Error(String(message));
      }

      // Extract rate limit info from response headers (set by Gateway Worker)
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
      const rateLimitUsed = response.headers.get('X-RateLimit-Used');

      const rateLimitInfo: RateLimitInfo | undefined = rateLimitRemaining
        ? {
            remaining: parseInt(rateLimitRemaining, 10),
            limit: parseInt(rateLimitLimit || '60', 10),
            used: parseInt(rateLimitUsed || '0', 10),
          }
        : undefined;

      return { imageData: extractFirstInlineImageData(data), rateLimit: rateLimitInfo };
    }

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
