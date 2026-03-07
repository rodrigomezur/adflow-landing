// Prompt Composition using Gemini Vision API
// Analyzes reference ad image and creates structured JSON prompt for Nano Banana

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
      referenceImageUrl,    // URL of competitor/reference ad to analyze
      productImageUrl,      // URL of our product image
      brandKit,             // { name, colors, description }
      profile,              // { persona, painPoint, angle, emotion }
      aspectRatio,          // '1:1', '4:5', '9:16'
      adStyle               // optional style override
    } = req.body;

    if (!referenceImageUrl) {
      return res.status(400).json({ error: 'referenceImageUrl is required' });
    }

    // Fetch the reference image and convert to base64
    let referenceImageBase64 = null;
    let productImageBase64 = null;
    
    try {
      console.log('Fetching reference image:', referenceImageUrl);
      const refResponse = await fetch(referenceImageUrl);
      if (refResponse.ok) {
        const buffer = await refResponse.arrayBuffer();
        referenceImageBase64 = Buffer.from(buffer).toString('base64');
        console.log('Reference image loaded, size:', referenceImageBase64.length);
      }
    } catch (imgErr) {
      console.error('Error fetching reference image:', imgErr);
    }
    
    if (productImageUrl) {
      try {
        console.log('Fetching product image:', productImageUrl);
        const prodResponse = await fetch(productImageUrl);
        if (prodResponse.ok) {
          const buffer = await prodResponse.arrayBuffer();
          productImageBase64 = Buffer.from(buffer).toString('base64');
          console.log('Product image loaded, size:', productImageBase64.length);
        }
      } catch (imgErr) {
        console.error('Error fetching product image:', imgErr);
      }
    }

    // Build the parts array with images
    const parts = [];
    
    // System instructions
    parts.push({
      text: `You are an expert at analyzing Facebook/Instagram ads and creating structured JSON prompts for Nano Banana 2 image generation.

CRITICAL: You must ACTUALLY LOOK AT the reference ad image I'm providing and describe its EXACT layout, composition, colors, and style.

Your task:
1. Analyze the reference ad image in detail
2. Note the exact layout, text placement, product placement, colors, style
3. Create a JSON prompt that will recreate this SAME layout and style
4. Replace the competitor's product with our product (described below)
5. Adapt the messaging for our target customer

OUTPUT FORMAT - Return ONLY valid JSON (no markdown, no explanation):
{
  "prompt": "Detailed visual description that recreates the reference ad layout with our product",
  "negative_prompt": "Elements to exclude",
  "settings": {
    "aspect_ratio": "${aspectRatio || '4:5'}",
    "style": "detected style from reference",
    "lighting": "detected lighting from reference",
    "camera": {
      "lens": "estimated lens",
      "angle": "detected angle",
      "framing": "detected framing",
      "depth_of_field": "detected DOF"
    },
    "color_grading": "detected color grading"
  },
  "referenceAnalysis": {
    "layout": "description of layout structure",
    "textPlacement": "where text appears",
    "productPlacement": "where product appears",
    "dominantColors": ["color1", "color2"],
    "style": "overall style assessment"
  }
}

RULES:
- The prompt should describe the EXACT layout from the reference image
- Describe WHERE elements are positioned (top, center, bottom, left, right)
- ALWAYS include the exact TEXT that should appear on the ad:
  * Write out the EXACT headline text in quotes
  * Write out any subheadline or body text in quotes
  * Write out the CTA button text in quotes
  * Example: 'Large white text at top reading "TRANSFORM YOUR SKIN IN 30 DAYS"'
- For the product: describe the EXACT product from the product image, not a generic version
- Keep prompt under 400 words but highly detailed
- Text is CRITICAL - the ad MUST have readable text overlays`
    });

    // Add reference image if we have it
    if (referenceImageBase64) {
      parts.push({
        text: "\n\nREFERENCE AD IMAGE TO ANALYZE:"
      });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceImageBase64
        }
      });
    } else {
      parts.push({
        text: `\n\nREFERENCE AD IMAGE URL (analyze this): ${referenceImageUrl}`
      });
    }

    // Add product image if we have it
    if (productImageBase64) {
      parts.push({
        text: "\n\nPRODUCT IMAGE TO USE (replace competitor's product with this exact product):"
      });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: productImageBase64
        }
      });
    } else if (productImageUrl) {
      parts.push({
        text: `\n\nPRODUCT IMAGE URL (use this exact product): ${productImageUrl}`
      });
    }

    // Add brand and profile context
    parts.push({
      text: `

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

REQUIRED ASPECT RATIO: ${aspectRatio || '4:5'}

Now analyze the reference ad image and create the JSON prompt. Remember:
1. LOOK at the reference image and describe its EXACT layout
2. Use the EXACT product from the product image
3. Include specific headline text targeting the customer persona
4. Maintain the same visual style and composition as the reference

Return ONLY the JSON object.`
    });

    console.log('Calling Gemini Vision API...');
    
    // Call Gemini API with vision
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000
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

    console.log('Gemini response received, parsing JSON...');

    // Parse JSON from response
    let jsonPrompt;
    try {
      let cleanedText = textContent.trim();
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/i, '');
      cleanedText = cleanedText.trim();
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      jsonPrompt = JSON.parse(cleanedText);
      
      if (!jsonPrompt.prompt) {
        throw new Error('Missing prompt field');
      }
      
      // Ensure required fields
      if (!jsonPrompt.negative_prompt) {
        jsonPrompt.negative_prompt = "blurry, low quality, distorted, extra fingers, watermark, cartoon, illustration, plastic skin, airbrushed, stock photo feel, text errors, misspelled words";
      }
      
      if (!jsonPrompt.settings) {
        jsonPrompt.settings = {};
      }
      
      // Force correct aspect ratio
      jsonPrompt.settings.aspect_ratio = aspectRatio || '4:5';
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', textContent.substring(0, 500));
      
      // Return fallback
      jsonPrompt = {
        prompt: textContent.substring(0, 800),
        negative_prompt: "blurry, low quality, distorted, watermark, cartoon, plastic skin, airbrushed, stock photo feel",
        settings: {
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
      model: 'gemini-2.5-flash-vision',
      analyzedReference: !!referenceImageBase64,
      analyzedProduct: !!productImageBase64
    });

  } catch (error) {
    console.error('Prompt composition error:', error);
    return res.status(500).json({ 
      error: 'Failed to compose prompt',
      details: error.message 
    });
  }
}
