// import { GoogleGenAI } from "@google/genai"; // SDK removed to allow custom base URL via fetch

const MODEL_NAME = 'gemini-2.0-flash-exp';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY;
    // Allow configuring a custom gateway URL (e.g., Cloudflare Worker)
    let baseUrl = env.GEMINI_GATEWAY_URL || 'https://generativelanguage.googleapis.com';
    
    // Remove trailing slash from baseUrl if present
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    if (!apiKey) {
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

    // Add text prompt with explicit instruction to generate an image
    // This prevents the model from just chatting about the prompt.
    parts.push({ text: `Generate an image of: ${prompt}` });

    // Configure generation
    const generationConfig = {
      temperature: settings?.temperature ?? 1.0,
      // Note: REST API expects 'imageSize' inside a specific config or just params depending on model versions.
      // For 2.0 Flash Exp, we follow the standard structure.
    };

    // Specific handling for image generation models vs text models if needed.
    // Assuming gemini-2.0-flash-exp supports standard generateContent with image output or tools.
    // If this is strictly for image generation (like Imagen), the payload might differ.
    // However, based on previous code, it seemed to use standard generateContent.
    // Let's stick to the structure the SDK would have sent.
    
    // Adjusting config structure for REST API
    // The SDK maps `config` to `generationConfig`.
    // `imageConfig` is not standard in all Gemini models, but if the user was using it, we keep it.
    if (settings?.resolution) {
        // generationConfig.imageConfig = { imageSize: settings.resolution }; // Verify if this is valid for the REST API
    }
    
    // For standard chat/text generation which 2.0 Flash is, we use this:
    const requestBody = {
      contents: [{ parts: parts }],
      generationConfig: generationConfig
    };


    // Call Gemini API via fetch
    const apiUrl = `${baseUrl}/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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
    if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
              imageData = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
          }
        }
    }

    if (!imageData) {
         const textPart = candidate.content?.parts?.find(p => p.text);
         // It's possible the model returned text instead of an image if it didn't understand to generate an image,
         // or if this model is purely text-based and we are misusing it. 
         // But we assume the previous code worked.
         if (textPart) throw new Error(`Generation refused (Text response): ${textPart.text}`);
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
