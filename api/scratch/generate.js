// AdFlow - Generate from Scratch: Image Generation
// Uses Nano Banana 2 (gemini-3.1-flash-image-preview) via Google Gemini API

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
      prompt,
      headline,
      cta,
      productImageBase64,
      productImageMimeType,
      referenceImagesBase64,  // Array of {base64, mimeType}
      aspectRatio = '4:5',
      variationId
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('=== Nano Banana 2 Generation ===');
    console.log('Variation ID:', variationId);
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Headline:', headline);
    console.log('Has product image:', !!productImageBase64);
    console.log('Reference count:', referenceImagesBase64?.length || 0);

    // Build the prompt parts for Nano Banana 2
    const parts = [];

    // Check if we have reference images to match style
    const hasReferences = referenceImagesBase64 && referenceImagesBase64.length > 0;

    // Add reference images FIRST so the model sees the target style
    if (hasReferences) {
      parts.push({ 
        text: `REFERENCE AD - COPY THIS EXACT STYLE:
Analyze this reference advertisement carefully. You MUST replicate:
- The exact visual style and aesthetic
- The composition and layout
- If there's a person/model/hands holding the product, include that
- The color grading and mood
- The text placement and typography style
- The background style and elements

Study this reference ad:` 
      });
      
      const refsToUse = referenceImagesBase64.slice(0, 2);
      for (let i = 0; i < refsToUse.length; i++) {
        const ref = refsToUse[i];
        parts.push({
          inlineData: {
            mimeType: ref.mimeType || 'image/jpeg',
            data: ref.base64
          }
        });
      }
    }

    // Add product image
    if (productImageBase64) {
      parts.push({ 
        text: "\n\n═══ PRODUCT TO USE (replace the product in reference with THIS exact product) ═══" 
      });
      parts.push({
        inlineData: {
          mimeType: productImageMimeType || 'image/jpeg',
          data: productImageBase64
        }
      });
    }

    // Main generation prompt
    let fullPrompt = `
═══ GENERATE AD IMAGE ═══
Aspect Ratio: ${aspectRatio}

${hasReferences ? `STYLE MATCHING (CRITICAL):
You MUST match the reference ad's visual style EXACTLY:
- Same composition style (product placement, camera angle)
- Same mood and color grading
- If reference has a person/model/hands → include person/model/hands
- If reference has lifestyle context → include lifestyle context
- If reference has bold text overlay style → use same text style
- Match the overall "vibe" of the reference

DO NOT default to generic white background product shots unless the reference uses that style.
` : ''}

PRODUCT: Use the EXACT product from the product image provided. Do not modify or reimagine it.

TEXT TO RENDER:
- Headline: "${headline}" (bold, prominent, modern sans-serif)
- CTA: "${cta}" (button-style at bottom)

CREATIVE DIRECTION FROM PLANNER:
${prompt}

OUTPUT: A high-quality ${aspectRatio} e-commerce advertisement that matches the reference style with the new product and text.`;

    parts.push({ text: fullPrompt });

    console.log('Calling Nano Banana 2...');

    // Call Nano Banana 2 (gemini-3.1-flash-image-preview)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            // Request image output
            responseModalities: ["IMAGE", "TEXT"]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nano Banana 2 API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Nano Banana 2 API error',
        details: errorText.substring(0, 500)
      });
    }

    const result = await response.json();
    console.log('Response received, extracting image...');

    // Extract image from response
    // Nano Banana returns images in the parts array
    const responseParts = result.candidates?.[0]?.content?.parts || [];
    
    let imageData = null;
    let imageMimeType = null;
    
    for (const part of responseParts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        imageMimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!imageData) {
      console.error('No image in response:', JSON.stringify(result).substring(0, 500));
      return res.status(500).json({ 
        error: 'No image generated',
        details: 'Nano Banana 2 did not return an image'
      });
    }

    console.log('✓ Image generated successfully');

    // Return as data URL for easy display
    const imageUrl = `data:${imageMimeType};base64,${imageData}`;

    return res.status(200).json({
      success: true,
      imageUrl,
      imageMimeType,
      variationId,
      aspectRatio,
      model: 'nano-banana-2'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
}
