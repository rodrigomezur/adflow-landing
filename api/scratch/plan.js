// AdFlow - Generate from Scratch: Creative Director
// Creates variation prompts optimized for Nano Banana 2

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
      productName, 
      productImageBase64,
      productImageMimeType,
      referenceImagesBase64,  // Array of {base64, mimeType}
      headline, 
      cta, 
      options = {} 
    } = req.body;
    
    const { 
      variations = 3, 
      language = 'es',
      aspectRatio = '4:5',
      price = '',
      subheadline = ''
    } = options;

    console.log('=== Scratch Plan Request ===');
    console.log('Product:', productName);
    console.log('Headline:', headline);
    console.log('Variations:', variations);
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Has product image:', !!productImageBase64);
    console.log('Reference count:', referenceImagesBase64?.length || 0);

    if (!productName || !headline || !cta) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['productName', 'headline', 'cta']
      });
    }

    const languageName = language === 'es' ? 'Spanish' : language === 'pt' ? 'Portuguese' : 'English';

    // Build prompt for Creative Director
    const parts = [];

    // System prompt using Nano Banana Framework 2 (Multimodal)
    parts.push({
      text: `You are an expert E-commerce Creative Director specializing in Nano Banana 2 image generation prompts.

Your task: Create ${variations} unique ad variation prompts for generating high-converting e-commerce ads.

═══════════════════════════════════════════════════════════════
PRODUCT INFORMATION
═══════════════════════════════════════════════════════════════
• Product Name: ${productName}
• Headline: "${headline}"
• Subheadline: "${subheadline || '(generate one)'}"
• CTA: "${cta}"
• Price: ${price || '(not shown)'}
• Language: ${languageName}
• Aspect Ratio: ${aspectRatio}

═══════════════════════════════════════════════════════════════
NANO BANANA 2 PROMPT FRAMEWORK
═══════════════════════════════════════════════════════════════
Each prompt MUST follow this structure:

[Subject]: The exact product from the reference image (DO NOT reimagine or change it)
[Action]: How the product is presented (floating, in-hand, on surface, etc.)
[Location/Context]: Background, environment, setting
[Composition]: Shot type (medium, close-up), framing (center, rule of thirds)
[Style]: Photography style, lighting, color grading
[Text]: EXACT text to render: headline "${headline}" and CTA "${cta}"

CRITICAL RULES:
1. The product image provided MUST appear exactly as-is - never reimagine or modify the product
2. Text MUST be enclosed in quotes for proper rendering
3. Specify exact text placement (top, center, bottom)
4. Include lighting details (softbox, natural, neon rim, etc.)
5. Specify camera/lens feel (commercial, editorial, lifestyle)

═══════════════════════════════════════════════════════════════
VARIATION STRATEGIES (create ${variations} unique variations using these)
═══════════════════════════════════════════════════════════════
1. HERO PRODUCT - Product dominates center, floating with subtle shadow, text top
2. LIFESTYLE CONTEXT - Product in-use scenario (on desk, in hand, kitchen counter)
3. BOLD CONTRAST - Dark background, high contrast, neon or vibrant accent colors
4. MINIMAL CLEAN - White/light background, lots of breathing room, elegant
5. SOCIAL PROOF - Include visual elements suggesting reviews/ratings aesthetic
6. URGENCY STYLE - Sale badge, price slash, limited time aesthetic
7. PREMIUM LUXURY - Dark tones, gold accents, sophisticated lighting

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT - RETURN ONLY VALID JSON
═══════════════════════════════════════════════════════════════
{
  "variations": [
    {
      "id": 1,
      "strategy": "hero-product | lifestyle | bold-contrast | minimal | social-proof | urgency | premium",
      "headline": "${headline}",
      "subheadline": "supporting text if any",
      "cta": "${cta}",
      "prompt": "Complete Nano Banana 2 prompt following the framework above. 150-200 words. Include exact text in quotes.",
      "textPlacement": "top | center | bottom | overlay",
      "colorScheme": "describe the color palette",
      "mood": "describe the emotional feel"
    }
  ]
}

IMPORTANT: 
- All text content (headline, subheadline, CTA) must be in ${languageName}
- Every prompt must include: "Render the text \\"${headline}\\" in bold sans-serif font"
- Every prompt must specify aspect ratio: ${aspectRatio}
- The product from the reference image must be preserved exactly as provided

Return ONLY the JSON object.`
    });

    // Add product image for context
    if (productImageBase64) {
      parts.push({ 
        text: "\n\n═══ PRODUCT IMAGE (this exact product must appear in all variations) ═══" 
      });
      parts.push({
        inlineData: {
          mimeType: productImageMimeType || 'image/jpeg',
          data: productImageBase64
        }
      });
    }

    // Add reference images for style inspiration
    if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
      parts.push({ 
        text: "\n\n═══ REFERENCE ADS (analyze for layout/style inspiration) ═══" 
      });
      
      const refsToUse = referenceImagesBase64.slice(0, 2);
      for (let i = 0; i < refsToUse.length; i++) {
        parts.push({ text: `\nReference ${i + 1}:` });
        parts.push({
          inlineData: {
            mimeType: refsToUse[i].mimeType || 'image/jpeg',
            data: refsToUse[i].base64
          }
        });
      }
    }

    // Final instruction
    parts.push({
      text: `\n\n═══ NOW CREATE ${variations} VARIATIONS ═══
Analyze the product and references, then create ${variations} unique Nano Banana 2 prompts.
Each must include the exact headline "${headline}" and CTA "${cta}" in the prompt.
Return ONLY JSON.`
    });

    console.log('Calling Gemini 2.5 Flash for planning...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Gemini API error',
        details: errorText.substring(0, 500)
      });
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    console.log('Gemini response received, parsing...');

    // Parse JSON
    let plan;
    try {
      let cleanedText = textContent.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      plan = JSON.parse(jsonMatch[0]);
      
      // Ensure all variations have the correct headline and CTA
      if (plan.variations) {
        plan.variations = plan.variations.map((v, i) => ({
          ...v,
          id: v.id || i + 1,
          headline: headline,  // Ensure correct headline
          cta: cta,            // Ensure correct CTA
          aspectRatio: aspectRatio
        }));
      }
      
    } catch (parseError) {
      console.error('Parse error:', parseError.message);
      return res.status(500).json({ 
        error: 'Failed to parse plan',
        details: parseError.message
      });
    }

    console.log('✓ Plan created with', plan.variations?.length, 'variations');

    return res.status(200).json({
      success: true,
      plan,
      meta: { 
        productName, 
        headline, 
        cta, 
        aspectRatio,
        variations: plan.variations?.length 
      }
    });

  } catch (error) {
    console.error('Plan creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create plan',
      details: error.message
    });
  }
}
