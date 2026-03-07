// Prompt Composition using Gemini API
// Takes reference ad, product, brand context → outputs structured JSON prompt for Nano Banana

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const {
      referenceImageUrl,    // URL of competitor/reference ad
      productImageUrl,      // URL of our product image
      brandKit,             // { name, colors, font, description }
      profile,              // { persona, painPoint, angle, emotion }
      aspectRatio,          // '1:1', '4:5', '9:16'
      adStyle               // 'ugc-selfie', 'studio-product', 'lifestyle', etc.
    } = req.body;

    if (!referenceImageUrl) {
      return res.status(400).json({ error: 'referenceImageUrl is required' });
    }

    // System prompt for Gemini - teaches it to create Nano Banana JSON prompts
    const systemPrompt = `You are an expert at analyzing Facebook/Instagram ads and creating structured JSON prompts for Nano Banana 2 image generation.

Your task is to analyze a reference ad image and create a detailed JSON prompt that will recreate a similar ad with a different product and messaging.

OUTPUT FORMAT - Return ONLY valid JSON (no markdown, no code blocks, no explanation). Use this exact structure:
{
  "prompt": "Detailed visual description of the ad creative - describe what's IN the image, not instructions",
  "negative_prompt": "Elements to exclude from the image",
  "settings": {
    "resolution": "1536x1536",
    "aspect_ratio": "4:5",
    "style": "ugc-selfie | lifestyle-in-context | studio-product-hero | flat-lay | editorial-beauty",
    "lighting": "ring-light | natural-window | golden-hour | studio-softbox | bathroom-vanity | dramatic-rim",
    "camera": {
      "lens": "35mm",
      "angle": "eye-level | low-angle | high-angle | overhead",
      "framing": "close-up | medium | full-body | wide",
      "depth_of_field": "shallow | moderate | deep"
    },
    "color_grading": "warm | cool | neutral | muted | vibrant"
  }
}

CRITICAL RULES:
1. The "prompt" field should be a VISUAL DESCRIPTION of what's in the image, NOT instructions
2. Describe specific details: materials, textures, lighting quality, skin texture, environment details
3. For UGC style: include "shot on iPhone, slight motion blur, casual composition, visible pores, natural skin texture"
4. For product shots: specify exact material properties ("matte packaging, glossy label, liquid inside glass bottle")
5. Always include negative_prompt to avoid AI artifacts
6. Spell out EXACTLY what text should appear on the product
7. Keep prompt under 300 words but highly detailed
8. Focus on recreating the LAYOUT and STYLE of the reference, not copying it exactly`;

    const userPrompt = `Analyze this reference ad and create a Nano Banana 2 JSON prompt.

REFERENCE AD IMAGE: ${referenceImageUrl}
${productImageUrl ? `PRODUCT IMAGE TO USE: ${productImageUrl}` : ''}

BRAND INFORMATION:
- Brand Name: ${brandKit?.name || 'Brand'}
- Primary Color: ${brandKit?.colors?.primary || '#000000'}
- Secondary Color: ${brandKit?.colors?.secondary || '#FFFFFF'}
- Description: ${brandKit?.description || ''}

${profile ? `TARGET CUSTOMER:
- Persona: ${profile.persona || profile.persona_name || ''}
- Pain Point: ${profile.painPoint || (profile.pain_points || [])[0] || ''}
- Messaging Angle: ${profile.angle || profile.messaging_angle || ''}
- Emotion to Convey: ${profile.emotion || profile.emotional_trigger || 'trust'}` : ''}

TECHNICAL REQUIREMENTS:
- Aspect Ratio: ${aspectRatio || '4:5'}
- Style Preference: ${adStyle || 'Match the reference ad style'}

Create a JSON prompt that:
1. Recreates the layout and visual style of the reference ad
2. Features the product from the product image prominently
3. Uses the brand colors and messaging
4. Targets the specified customer persona with appropriate headline/copy
5. Looks authentic and scroll-stopping, NOT like AI-generated

Return ONLY the JSON object, no markdown, no explanation.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', errorText);
      return res.status(response.status).json({ 
        error: 'Gemini API error',
        details: errorText
      });
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    // Parse JSON from response
    let jsonPrompt;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = textContent.trim();
      
      // Remove various markdown code block formats
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/i, '');
      cleanedText = cleanedText.trim();
      
      // Try to extract JSON object from text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      jsonPrompt = JSON.parse(cleanedText);
      
      // Ensure required fields exist
      if (!jsonPrompt.prompt) {
        throw new Error('Missing prompt field');
      }
      
      // Add default negative prompt if missing
      if (!jsonPrompt.negative_prompt) {
        jsonPrompt.negative_prompt = "blurry, low quality, distorted, extra fingers, extra limbs, watermark, cartoon, illustration, anime, 3d render, oversaturated, plastic skin, airbrushed, stock photo feel, text errors, misspelled words";
      }
      
      // Ensure settings exist
      if (!jsonPrompt.settings) {
        jsonPrompt.settings = {};
      }
      
      // Apply aspect ratio
      jsonPrompt.settings.aspect_ratio = aspectRatio || jsonPrompt.settings.aspect_ratio || '4:5';
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', textContent);
      
      // Fallback: create a basic JSON prompt from the text
      jsonPrompt = {
        prompt: textContent.substring(0, 500),
        negative_prompt: "blurry, low quality, distorted, extra fingers, watermark, cartoon, illustration, plastic skin, airbrushed, stock photo feel",
        settings: {
          resolution: "1536x1536",
          aspect_ratio: aspectRatio || "4:5",
          style: adStyle || "lifestyle-in-context",
          lighting: "natural-window",
          camera: {
            lens: "35mm",
            angle: "eye-level",
            framing: "medium",
            depth_of_field: "shallow"
          },
          color_grading: "warm"
        }
      };
    }

    return res.status(200).json({
      success: true,
      jsonPrompt: jsonPrompt,
      model: 'gemini-2.5-flash'
    });

  } catch (error) {
    console.error('Prompt composition error:', error);
    return res.status(500).json({ 
      error: 'Failed to compose prompt',
      details: error.message 
    });
  }
}
