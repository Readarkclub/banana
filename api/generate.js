const MODEL_NAME = 'gemini-3.1-flash-image-preview';

function normalizeBaseUrl(url) {
  const trimmed = String(url || '').replace(/\/+$/, '');

  if (trimmed === 'https://readark.club/api') {
    return 'https://api.readark.club/api';
  }

  return trimmed;
}

function buildGatewayHeaders(apiSecretKey, apiKey) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    ...(apiSecretKey ? { Authorization: `Bearer ${apiSecretKey}` } : {}),
    ...(!apiSecretKey && apiKey ? { 'x-goog-api-key': apiKey } : {}),
  };
}

function extractFirstInlineImageData(responseData) {
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

  const textPart = Array.isArray(parts) ? parts.find((part) => part?.text) : null;
  if (textPart?.text) {
    throw new Error(`Generation refused (Text response): ${String(textPart.text).slice(0, 200)}...`);
  }

  throw new Error('No image data returned.');
}

function parseRequestBody(req) {
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const apiSecretKey = process.env.API_SECRET_KEY || process.env.VITE_API_SECRET_KEY;
    const gatewayUrl = process.env.GEMINI_GATEWAY_URL || process.env.VITE_GEMINI_GATEWAY_URL;

    let baseUrl = gatewayUrl || 'https://generativelanguage.googleapis.com';
    baseUrl = normalizeBaseUrl(baseUrl);

    if (!apiKey && !gatewayUrl) {
      return res.status(500).json({ error: 'Configuration Error: Missing API Key' });
    }

    if (gatewayUrl && !apiSecretKey) {
      return res.status(500).json({ error: 'Configuration Error: Missing API_SECRET_KEY for gateway mode' });
    }

    const body = parseRequestBody(req);
    const { prompt, referenceImagesBase64, settings } = body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const parts = [];

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
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(settings?.aspectRatio && settings.aspectRatio !== 'Auto'
          ? { imageConfig: { aspectRatio: settings.aspectRatio } }
          : {}),
        temperature: settings?.temperature ?? 1.0,
      },
    };

    const apiUrl = `${baseUrl}/v1/models/${MODEL_NAME}:generateContent`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: buildGatewayHeaders(apiSecretKey, apiKey),
      body: JSON.stringify(requestBody),
    });

    const responseText = await apiResponse.text();
    const responseData = responseText ? JSON.parse(responseText) : {};

    if (!apiResponse.ok) {
      res.status(apiResponse.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify(responseData));
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(
      JSON.stringify({
        imageData: extractFirstInlineImageData(responseData),
      }),
    );
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}
