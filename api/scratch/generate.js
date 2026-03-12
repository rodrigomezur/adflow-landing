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

    // Main generation prompt using Framework 2 (Multimodal) from the skill
    let fullPrompt = `Generate a high-quality e-commerce advertisement image in ${aspectRatio} aspect ratio.

${prompt}

CRITICAL REQUIREMENTS:
1. Use the EXACT product from the provided product image - do not change or reimagine the product
2. Render the headline text "${headline}" prominently in bold, modern sans-serif font
3. Include the CTA button text "${cta}" at the bottom
4. Maintain ${aspectRatio} aspect ratio exactly
5. Make the text highly legible against the background

STYLE: Professional e-commerce ad, scroll-stopping, high contrast, commercial photography quality.
TEXT: Render "${headline}" as the main headline in bold white or contrasting text.
CTA: Render "${cta}" as a button-style element at the bottom.`;

    parts.push({ text: fullPrompt });

    // Add product image (CRITICAL - this is what must be preserved)
    if (productImageBase64) {
      parts.push({ 
        text: "\n\nPRODUCT IMAGE (use this exact product, do not modify or reimagine it):" 
      });
      parts.push({
        inlineData: {
          mimeType: productImageMimeType || 'image/jpeg',
          data: productImageBase64
        }
      });
    }

    // Add reference images for style (limit to 2)
    if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
      parts.push({ 
        text: "\n\nREFERENCE ADS (use these for layout and style inspiration only, not for product):" 
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

    // Final instruction
    parts.push({
      text: `\n\nNow generate the advertisement image with:
- The exact product from the product image
- Headline text: "${headline}"
- CTA text: "${cta}"
- Aspect ratio: ${aspectRatio}
- Professional, high-converting e-commerce ad style`
    });

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
