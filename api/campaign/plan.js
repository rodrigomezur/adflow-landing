// Campaign Creative Director - Gemini analyzes reference ad and generates multiple prompt variations
// One Gemini call → Multiple prompts → Batch generation

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
      referenceImageUrl,    // Reference ad to analyze
      productImageUrl,      // Product image
      brandKit,             // { name, colors, description }
      profiles,             // Array of customer profiles
      numVariations,        // Total number of variations to generate
      aspectRatio,          // '1:1', '4:5', '9:16'
      language,             // 'es', 'en', 'pt', 'fr'
      visualStyle,          // 'match', 'ugc', 'premium', etc.
      customCta,            // Custom CTA text
      variationStrategy     // 'profiles' | 'angles' | 'mixed'
    } = req.body;

    // Language mapping
    const languageNames = {
      'es': 'Spanish (Español)',
      'en': 'English',
      'pt': 'Portuguese (Português)',
      'fr': 'French (Français)'
    };
    const outputLanguage = languageNames[language] || 'Spanish (Español)';

    if (!referenceImageUrl) {
      return res.status(400).json({ error: 'referenceImageUrl is required' });
    }

    const totalVariations = numVariations || 10;
    
    // Fetch reference image
    let referenceImageBase64 = null;
    try {
      console.log('Fetching reference image for Creative Director analysis...');
      const refResponse = await fetch(referenceImageUrl);
      if (refResponse.ok) {
        const buffer = await refResponse.arrayBuffer();
        referenceImageBase64 = Buffer.from(buffer).toString('base64');
      }
    } catch (imgErr) {
      console.error('Error fetching reference image:', imgErr);
    }

    // Fetch product image
    let productImageBase64 = null;
    if (productImageUrl) {
      try {
        const prodResponse = await fetch(productImageUrl);
        if (prodResponse.ok) {
          const buffer = await prodResponse.arrayBuffer();
          productImageBase64 = Buffer.from(buffer).toString('base64');
        }
      } catch (imgErr) {
        console.error('Error fetching product image:', imgErr);
      }
    }

    // Build the Creative Director prompt
    const parts = [];
    
    // System prompt for Creative Director
    parts.push({
      text: `You are a Creative Director for Facebook/Instagram advertising. Your job is to analyze a reference ad and create ${totalVariations} unique ad variations.

CRITICAL: All text content (headlines, subheadlines, CTAs) MUST be in ${outputLanguage}. This is mandatory.

TASK:
1. Analyze the reference ad image in detail (layout, style, colors, text placement, product placement)
2. Create ${totalVariations} DIFFERENT prompt variations that:
   - Maintain the same general layout and style
   - Each has a UNIQUE headline targeting different customer pain points
   - Each has slightly different visual emphasis
   - KEEP THE PRODUCT EXACTLY AS IT APPEARS IN THE PRODUCT IMAGE - DO NOT MODIFY THE PRODUCT
   - Only change background, scene, context, and text - NEVER change the product itself

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "referenceAnalysis": {
    "layout": "description of layout structure",
    "style": "overall visual style",
    "textPlacement": "where text appears",
    "productPlacement": "where product appears",
    "dominantColors": ["color1", "color2"],
    "mood": "emotional tone of the ad"
  },
  "variations": [
    {
      "id": 1,
      "targetProfile": "profile name or description",
      "headline": "EXACT headline text for this variation",
      "subheadline": "secondary text if any",
      "cta": "call to action text",
      "visualEmphasis": "what to emphasize visually",
      "prompt": "Full detailed image generation prompt",
      "negative_prompt": "what to avoid"
    }
  ]
}

VARIATION STRATEGIES:
${profiles && profiles.length > 0 ? `
Customer Profiles to target (create variations for each):
${profiles.map((p, i) => `${i + 1}. ${p.persona_name || p.persona}: Pain point: "${(p.pain_points || [])[0] || p.painPoint || 'general'}", Emotion: ${p.emotional_trigger || p.emotion || 'trust'}`).join('\n')}
` : `
Create variations targeting these angles:
1. Social Proof (testimonials, ratings, "X customers love us")
2. Pain Point (address a specific problem)
3. Benefit-Focused (highlight key benefits)
4. Urgency (limited time, scarcity)
5. Trust/Credibility (guarantees, certifications)
6. Transformation (before/after mindset)
7. Value/Price (great deal, savings)
8. Simplicity (easy to use, quick results)
9. Premium/Quality (high-end positioning)
10. Community (join others like you)
`}

RULES FOR EACH PROMPT:
- ALL TEXT (headlines, subheadlines, CTAs) MUST BE IN ${outputLanguage}
- Include EXACT text that should appear (headlines in quotes)
- Describe the layout based on the reference ad
- CRITICAL: The prompt MUST instruct to keep the product EXACTLY as shown - same shape, colors, details, branding. Add text like "Keep the product from the reference image identical, only change the background/scene"
- Use brand colors: ${brandKit?.colors?.primary || '#000'} and ${brandKit?.colors?.secondary || '#FFF'}
- Each prompt should be 150-250 words
- Include negative_prompt for each variation (always include "distorted product, modified product, different product")
${customCta ? `- Use this CTA when appropriate: "${customCta}"` : ''}

LANGUAGE: ${outputLanguage} (ALL ad copy must be in this language)
Aspect ratio for all: ${aspectRatio || '4:5'}
PRODUCT FIDELITY: MANDATORY - The product must remain identical to the reference. Only the scene/background/context changes.`
    });

    // Add reference image
    if (referenceImageBase64) {
      parts.push({
        text: "\n\nREFERENCE AD TO ANALYZE AND REPLICATE:"
      });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceImageBase64
        }
      });
    }

    // Add product image
    if (productImageBase64) {
      parts.push({
        text: "\n\nPRODUCT TO FEATURE (use this exact product in all variations):"
      });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: productImageBase64
        }
      });
    }

    // Add brand context
    parts.push({
      text: `

BRAND INFORMATION:
- Brand Name: ${brandKit?.name || 'Brand'}
- Primary Color: ${brandKit?.colors?.primary || '#000000'}
- Secondary Color: ${brandKit?.colors?.secondary || '#FFFFFF'}
- Description: ${brandKit?.description || ''}

Now analyze the reference ad and create ${totalVariations} unique variations. Each should have a different headline and angle while maintaining the same visual style.

Return ONLY the JSON object.`
    });

    console.log('Calling Gemini Creative Director...');
    console.log('Generating', totalVariations, 'variations');
    
    // Call Gemini API (use gemini-2.0-flash-001 for latest stable)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.8,  // Slightly higher for more creative variations
            maxOutputTokens: 8000  // Need more tokens for multiple variations
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

    console.log('Creative Director response received, parsing...');

    // Parse JSON with robust error handling
    let campaignPlan;
    try {
      let cleanedText = textContent.trim();
      
      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/i, '');
      cleanedText = cleanedText.trim();
      
      // Extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON object found in response');
        console.error('Raw response (first 500 chars):', textContent.substring(0, 500));
        throw new Error('No JSON object found in Gemini response');
      }
      
      cleanedText = jsonMatch[0];
      
      // Fix common JSON issues from AI
      cleanedText = cleanedText.replace(/,\s*}/g, '}');  // trailing commas in objects
      cleanedText = cleanedText.replace(/,\s*]/g, ']');  // trailing commas in arrays
      
      campaignPlan = JSON.parse(cleanedText);
      
      // Ensure variations array exists
      if (!campaignPlan.variations || !Array.isArray(campaignPlan.variations)) {
        console.error('Response missing variations array:', Object.keys(campaignPlan));
        throw new Error('Missing variations array in response');
      }
      
      // Add settings to each variation
      campaignPlan.variations = campaignPlan.variations.map((v, i) => ({
        ...v,
        id: v.id || i + 1,
        settings: {
          aspect_ratio: aspectRatio || '4:5',
          style: campaignPlan.referenceAnalysis?.style || 'lifestyle-in-context',
          lighting: 'natural-window',
          camera: {
            lens: '35mm',
            angle: 'eye-level',
            depth_of_field: 'shallow'
          },
          color_grading: 'warm'
        },
        negative_prompt: v.negative_prompt || "blurry, low quality, distorted, watermark, cartoon, plastic skin, text errors"
      }));
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text (first 1500):', textContent.substring(0, 1500));
      
      return res.status(500).json({ 
        error: 'Failed to parse campaign plan',
        details: parseError.message,
        rawPreview: textContent.substring(0, 300),
        hint: 'Gemini may have returned invalid JSON. Check if response was truncated.'
      });
    }

    console.log('Campaign plan created with', campaignPlan.variations.length, 'variations');

    return res.status(200).json({
      success: true,
      plan: campaignPlan,
      totalVariations: campaignPlan.variations.length,
      model: 'gemini-2.0-flash',
      referenceImageAnalyzed: !!referenceImageBase64,
      productImageAnalyzed: !!productImageBase64
    });

  } catch (error) {
    console.error('Campaign planning error:', error);
    return res.status(500).json({ 
      error: 'Failed to create campaign plan',
      details: error.message 
    });
  }
}
