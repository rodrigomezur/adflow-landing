// AdFlow - Generate from Scratch: Creative Director
// Analyzes references + product to create variation prompts

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
      productImageUrl,
      referenceUrls,      // Array of reference ad URLs
      headline,
      cta,
      options = {}
    } = req.body;

    // Defaults
    const {
      price = '',
      subheadline = '',
      websiteUrl = '',
      aspectRatio = '4:5',
      variations = 5,
      language = 'es'
    } = options;

    // Validation
    if (!productName || !productImageUrl || !referenceUrls?.length || !headline || !cta) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['productName', 'productImageUrl', 'referenceUrls', 'headline', 'cta']
      });
    }

    console.log('=== Scratch Plan Request ===');
    console.log('Product:', productName);
    console.log('References:', referenceUrls.length);
    console.log('Variations:', variations);

    // Helper to extract base64 from data URL or fetch from URL
    async function loadImage(url, label = 'image') {
      if (!url) {
        console.error(`${label}: No URL provided`);
        return null;
      }
      
      console.log(`${label}: URL type = ${url.substring(0, 30)}...`);
      
      // Check if it's a data URL (base64)
      if (url.startsWith('data:')) {
        // More flexible regex to handle various data URL formats
        const commaIndex = url.indexOf(',');
        if (commaIndex === -1) {
          console.error(`${label}: Invalid data URL - no comma found`);
          return null;
        }
        
        const header = url.substring(0, commaIndex);
        const base64Data = url.substring(commaIndex + 1);
        
        // Extract mime type from header like "data:image/jpeg;base64"
        const mimeMatch = header.match(/data:([^;,]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        console.log(`${label}: Data URL parsed - mimeType=${mimeType}, base64Length=${base64Data.length}`);
        
        return {
          base64: base64Data,
          mimeType: mimeType
        };
      }
      
      // Otherwise fetch the URL
      try {
        console.log(`${label}: Fetching URL...`);
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const base64 = Buffer.from(buffer).toString('base64');
          console.log(`${label}: Fetched - mimeType=${contentType}, base64Length=${base64.length}`);
          return {
            base64: base64,
            mimeType: contentType.split(';')[0]
          };
        } else {
          console.error(`${label}: Fetch failed with status ${response.status}`);
        }
      } catch (err) {
        console.error(`${label}: Fetch error - ${err.message}`);
      }
      return null;
    }

    // Load all images
    const images = [];

    // 1. Product image
    const productImg = await loadImage(productImageUrl, 'Product');
    if (productImg) {
      images.push({
        type: 'product',
        ...productImg
      });
      console.log('✓ Product image loaded');
    } else {
      console.error('✗ Failed to load product image');
    }

    // 2. Reference images
    for (let i = 0; i < referenceUrls.length; i++) {
      const refImg = await loadImage(referenceUrls[i], `Reference ${i + 1}`);
      if (refImg) {
        images.push({
          type: 'reference',
          index: i + 1,
          ...refImg
        });
        console.log(`✓ Reference ${i + 1} loaded`);
      } else {
        console.error(`✗ Failed to load reference ${i + 1}`);
      }
    }

    if (images.length === 0) {
      return res.status(400).json({ 
        error: 'Could not load any images',
        hint: 'Make sure images are valid base64 data URLs or accessible URLs'
      });
    }
    
    // Log image sizes for debugging
    console.log('Images loaded:', images.map(img => ({
      type: img.type,
      mimeType: img.mimeType,
      base64Length: img.base64?.length || 0
    })));

    // Language mapping
    const languageNames = {
      'es': 'Spanish (Español)',
      'en': 'English',
      'pt': 'Portuguese (Português)',
      'fr': 'French (Français)'
    };
    const outputLanguage = languageNames[language] || 'Spanish (Español)';

    // Build Gemini request
    const parts = [];

    // System prompt
    parts.push({
      text: `You are an Elite E-commerce Creative Director specializing in high-converting Meta/Instagram ads.

═══════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════
Analyze the reference ads and product image, then create ${variations} unique ad variations.

═══════════════════════════════════════════════════════════════
PRODUCT INFORMATION
═══════════════════════════════════════════════════════════════
• Product Name: ${productName}
• Price: ${price || '(not shown)'}
• Main Headline: "${headline}"
• Subheadline: "${subheadline || '(generate one)'}"
• CTA Button: "${cta}"
• Brand Website: ${websiteUrl || '(not provided)'}

═══════════════════════════════════════════════════════════════
OUTPUT SPECIFICATIONS  
═══════════════════════════════════════════════════════════════
• Aspect Ratio: ${aspectRatio}
• Language: ALL text must be in ${outputLanguage}
• Variations: ${variations}

═══════════════════════════════════════════════════════════════
ANALYSIS INSTRUCTIONS
═══════════════════════════════════════════════════════════════
For each reference ad, analyze:
1. Layout structure (text placement, product position, CTA location)
2. Color palette and contrast
3. Typography style (bold, minimal, etc.)
4. Visual hooks (what makes it scroll-stopping)
5. Product presentation (floating, lifestyle, mockup)

═══════════════════════════════════════════════════════════════
VARIATION STRATEGIES (mix these across your ${variations} variations)
═══════════════════════════════════════════════════════════════
1. HERO PRODUCT - Product dominates 60% of frame, bold text top
2. LIFESTYLE - Product in-use context, aspirational
3. SOCIAL PROOF - Include review quotes, star ratings, trust badges
4. URGENCY - Price badges, "limited time" styling (tasteful, not spammy)
5. MINIMAL - Clean, lots of whitespace, elegant
6. BOLD CONTRAST - High contrast colors, large text, dramatic
7. SPLIT LAYOUT - Text one side, product other side

═══════════════════════════════════════════════════════════════
PROMPT WRITING RULES (CRITICAL)
═══════════════════════════════════════════════════════════════
Each prompt must be 150-200 words and include:

1. LAYOUT (be specific):
   - "Top 20%: Bold white headline text"
   - "Center 50%: Product floating with soft shadow"
   - "Bottom 20%: CTA button in brand color"

2. EXACT TEXT TO RENDER:
   - Write the headline in quotes
   - Write the CTA in quotes
   - Include price if provided

3. STYLE DIRECTION:
   - Background: color/gradient/scene
   - Typography: "bold condensed sans-serif" etc
   - Mood: "premium and trustworthy" etc

4. PRODUCT INSTRUCTION (ALWAYS INCLUDE):
   "Keep the product from the reference image EXACTLY as provided - same shape, colors, details. Only change background and context."

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT - RETURN ONLY VALID JSON
═══════════════════════════════════════════════════════════════
{
  "referenceAnalysis": {
    "layoutPatterns": ["what layouts the references use"],
    "colorPalette": ["#hex1", "#hex2", "#hex3"],
    "typographyStyle": "description",
    "strengths": ["what makes these ads effective"]
  },
  "variations": [
    {
      "id": 1,
      "strategy": "hero-product | lifestyle | social-proof | urgency | minimal | bold | split",
      "headline": "EXACT headline text in ${outputLanguage}",
      "subheadline": "secondary text or empty string",
      "cta": "button text",
      "prompt": "Full 150-200 word image generation prompt with layout specifics, text placement, style direction, and product preservation instruction",
      "negative_prompt": "blurry, low quality, distorted product, modified product, watermark, cartoon, cluttered, hard to read text",
      "thumbnailDescription": "Brief 10-word description for preview"
    }
  ]
}

Return ONLY the JSON. No markdown, no explanation.`
    });

    // Add product image
    const productImg = images.find(i => i.type === 'product');
    if (productImg) {
      parts.push({ text: "\n\n═══ PRODUCT IMAGE (keep this EXACTLY as-is in all variations) ═══" });
      parts.push({
        inlineData: {
          mimeType: productImg.mimeType,
          data: productImg.base64
        }
      });
    }

    // Add reference images
    const refImages = images.filter(i => i.type === 'reference');
    if (refImages.length > 0) {
      parts.push({ text: "\n\n═══ REFERENCE ADS (analyze these for style/layout inspiration) ═══" });
      for (const ref of refImages) {
        parts.push({ text: `\nReference ${ref.index}:` });
        parts.push({
          inlineData: {
            mimeType: ref.mimeType,
            data: ref.base64
          }
        });
      }
    }

    // Final instruction
    parts.push({
      text: `\n\n═══ NOW CREATE ${variations} VARIATIONS ═══\nAnalyze the references, then create ${variations} unique ad variations following the format above. Return ONLY JSON.`
    });

    console.log('Calling Gemini Creative Director...');
    
    // Call Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
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
      
      // Parse error for more details
      let errorDetails = errorText;
      try {
        const errJson = JSON.parse(errorText);
        errorDetails = errJson.error?.message || errJson.error || errorText;
      } catch (e) {}
      
      return res.status(response.status).json({ 
        error: 'Gemini API error',
        details: errorDetails,
        imagesLoaded: images.length,
        hint: 'Check if images are too large or API key is valid'
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
      let cleanedText = textContent.trim();
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/i, '');
      cleanedText = cleanedText.trim();
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found');
      }
      
      cleanedText = jsonMatch[0];
      cleanedText = cleanedText.replace(/,\s*}/g, '}');
      cleanedText = cleanedText.replace(/,\s*]/g, ']');
      
      plan = JSON.parse(cleanedText);
      
      if (!plan.variations || !Array.isArray(plan.variations)) {
        throw new Error('Missing variations array');
      }

      // Add settings to each variation
      plan.variations = plan.variations.map((v, i) => ({
        ...v,
        id: v.id || i + 1,
        settings: {
          aspectRatio,
          productImageUrl,
          referenceUrls
        }
      }));
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw (first 1000):', textContent.substring(0, 1000));
      
      return res.status(500).json({ 
        error: 'Failed to parse plan',
        details: parseError.message,
        rawPreview: textContent.substring(0, 300)
      });
    }

    console.log(`✓ Plan created with ${plan.variations.length} variations`);

    return res.status(200).json({
      success: true,
      plan,
      meta: {
        productName,
        headline,
        cta,
        aspectRatio,
        language,
        variationsRequested: variations,
        variationsCreated: plan.variations.length,
        referencesAnalyzed: refImages.length
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
