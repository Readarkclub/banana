// import { GoogleGenAI } from "@google/genai"; // SDK removed to allow custom base URL via fetch

const MODEL_NAME = 'gemini-3-pro-image-preview';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY;
    const gatewayUrl = env.GEMINI_GATEWAY_URL;
    // Allow configuring a custom gateway URL (e.g., Cloudflare Worker)
    let baseUrl = gatewayUrl || 'https://generativelanguage.googleapis.com';
    
    // Remove trailing slash from baseUrl if present
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    // If using Google's direct API endpoint, an API key is required.
    // If a gateway is configured, the gateway may inject authentication itself.
    if (!apiKey && !gatewayUrl) {
      return new Response(JSON.stringify({ error: "Configuration Error: Missing API Key" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the JSON body from the frontend
    const body = await request.json();
    const { prompt, referenceImagesBase64, settings } = body;

    if (!prompt) {
        return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }

    const parts = [];

    // Process reference images
    if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
      for (const refImg of referenceImagesBase64) {
          const matches = refImg.match(/^data:(.+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            parts.push({
              inlineData: {
                mimeType: matches[1],
                data: matches[2],
              },
            });
          }
      }
    }

    // Add text prompt with strict instruction
    // We need to ensure the model knows this is an image generation request.
    // For Gemini models that support creating images (like via Imagen integration), specific keywords often help.
    // Using a very direct prompt to bypass "helpful assistant" chat mode.
    parts.push({ text: `[Strict Image Generation Mode]
Do not describe how to draw. Do not generate text.
Generate a high-quality image based on this prompt: ${prompt}` });

    // Configure generation
    const generationConfig = {
      temperature: settings?.temperature ?? 1.0,
    };

    if (settings?.resolution) {
        // generationConfig.imageConfig = { imageSize: settings.resolution }; // Verify if this is valid for the REST API
    }
    
    const requestBody = {
      contents: [{ parts: parts }],
      generationConfig: generationConfig
    };


    // Call Gemini API via fetch
    const apiUrl = `${baseUrl}/v1beta/models/${MODEL_NAME}:generateContent`;
    console.log('[DEBUG] Requesting URL:', apiUrl);
    console.log('[DEBUG] baseUrl:', baseUrl);

    const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-goog-api-key': apiKey } : {}),
        },
        body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Gemini API Error ${apiResponse.status}: ${errorText}`);
    }

    const responseData = await apiResponse.json();

    // --- Logic adapted from original service ---
    if (!responseData.candidates || responseData.candidates.length === 0) {
        throw new Error("The model did not return any candidates.");
    }
    const candidate = responseData.candidates[0];
    
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'IMAGE_OTHER') {
        throw new Error(`Generation blocked: ${candidate.finishReason}`);
    }

    let imageData = null;
    // Check for inline data (standard for some models)
    if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
              imageData = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
          }
        }
    }
    
    // Check for executable code that might contain image data (sometimes used in 2.0)
    // Or check if the model returned a tool call that generated an image? 
    // For simple REST, we expect inlineData.

    if (!imageData) {
         const textPart = candidate.content?.parts?.find(p => p.text);
         if (textPart) throw new Error(`Generation refused (Text response): ${textPart.text.substring(0, 100)}...`);
         throw new Error("No image data returned.");
    }

    return new Response(JSON.stringify({ imageData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
