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
      options = {},
      intelligence = null  // Research data from product URL
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
    console.log('Creative Brief:', headline);
    console.log('Variations:', variations);
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Has product image:', !!productImageBase64);
    console.log('Reference count:', referenceImagesBase64?.length || 0);
    console.log('Has intelligence:', !!intelligence);
    console.log('Mode:', intelligence ? 'Smart Research' : 'Manual');

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
      text: `You are an expert E-commerce Creative Director and Copywriter specializing in high-converting ad creatives.

Your task: Create ${variations} unique ad variations with SHORT, PUNCHY headlines optimized for social media ads.

═══════════════════════════════════════════════════════════════
PRODUCT INFORMATION
═══════════════════════════════════════════════════════════════
• Product Name: ${productName}
• Creative Brief: "${headline}"
• CTA: "${cta}"
• Price: ${price || intelligence?.price || '(not shown)'}
• Language: ${languageName}
• Aspect Ratio: ${aspectRatio}
${intelligence ? `
═══════════════════════════════════════════════════════════════
PRODUCT INTELLIGENCE (from research)
═══════════════════════════════════════════════════════════════
• Category: ${intelligence.category || 'Unknown'}
• Core Benefit: ${intelligence.coreBenefit || 'Unknown'}
• Key Benefits: ${(intelligence.benefits || []).join(', ') || 'Unknown'}
• Pain Points Solved: ${(intelligence.painPoints || []).join(', ') || 'Unknown'}
• USPs: ${(intelligence.uniqueSellingPoints || []).join(', ') || 'Unknown'}
• Target Audience: ${intelligence.targetAudience?.demographics || ''} - ${intelligence.targetAudience?.psychographics || ''}
• Social Proof: ${(intelligence.socialProof?.trustSignals || []).join(', ') || 'None found'}
• Visual Style Recommendation: ${intelligence.visualRecommendations?.style || 'professional'} / ${intelligence.visualRecommendations?.mood || 'trustworthy'}
• Suggested Colors: ${(intelligence.visualRecommendations?.colors || []).join(', ') || 'brand colors'}

USE THIS INTELLIGENCE to create targeted, benefit-focused headlines that speak to the audience's pain points.
` : ''}

═══════════════════════════════════════════════════════════════
🎯 HEADLINE RULES (CRITICAL - FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════
The "Creative Brief" above is just INSPIRATION. You must CREATE NEW headlines.

HEADLINE REQUIREMENTS:
✅ Maximum 6-8 words (STRICT LIMIT)
✅ One clear message per headline
✅ Use power words: Free, New, Proven, Secret, Finally, Instant, Easy
✅ Include numbers when relevant (5,000+ Reviews, 30-Day, 2X Faster)
✅ Create DIFFERENT angles for each variation

HEADLINE FORMULAS TO USE:
• [Number] + [Benefit]: "5,000+ Five-Star Reviews"
• [Pain Point] + [Solution]: "No Powders. No Bloat."
• [Desire] + [Product]: "Creatine You'll Actually Crave"
• [Social Proof]: "The Gummies Everyone's Talking About"
• [Urgency]: "Limited Time: 30% Off"
• [Transformation]: "From Tired to Unstoppable"

❌ NEVER DO:
- Headlines longer than 8 words
- Multiple benefits crammed together
- Generic phrases like "Best Quality Product"
- Copying the creative brief verbatim

SUBHEADLINE (optional):
- Maximum 10-12 words
- Supports the headline with secondary benefit
- Can be omitted for cleaner designs

═══════════════════════════════════════════════════════════════
NANO BANANA 2 PROMPT FRAMEWORK
═══════════════════════════════════════════════════════════════
Each prompt MUST follow this structure:

[Subject]: The exact product from the reference image (DO NOT reimagine or change it)
[Action]: How the product is presented (floating, in-hand, on surface, etc.)
[Location/Context]: Background, environment, setting
[Composition]: Shot type (medium, close-up), framing (center, rule of thirds)
[Style]: Photography style, lighting, color grading
[Text]: Your GENERATED short headline (in quotes) + CTA "${cta}" (in quotes)

CRITICAL RULES:
1. The product image provided MUST appear exactly as-is - never reimagine or modify the product
2. Text MUST be enclosed in quotes for proper rendering: "Your Headline Here"
3. Specify exact text placement (top, center, bottom)
4. Include lighting details (softbox, natural, neon rim, etc.)
5. Specify camera/lens feel (commercial, editorial, lifestyle)
6. Headlines in prompt must match the short headline you generate for that variation

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
AD ANGLES - CREATE ${variations} DIFFERENT ANGLES
═══════════════════════════════════════════════════════════════
Each variation should use a DIFFERENT angle:

1. SOCIAL PROOF - Reviews, ratings, "bestseller", "viral"
2. BENEFIT-FOCUSED - Main transformation or result
3. PAIN POINT - Problem → Solution
4. URGENCY/SCARCITY - Limited time, low stock, exclusive
5. CURIOSITY - Question, "secret", "discover"
6. LIFESTYLE - Aspirational identity, "for people who..."
7. COMPARISON - "Unlike others...", "Finally, a..."

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT - RETURN ONLY VALID JSON
═══════════════════════════════════════════════════════════════
{
  "referenceAnalysis": "Describe the reference ad style: hand holding product, beige background, bullet points on right, minimal aesthetic, etc.",
  "variations": [
    {
      "id": 1,
      "angle": "social-proof | benefit | pain-point | urgency | curiosity | lifestyle | comparison",
      "strategy": "hero-product | lifestyle | bold-contrast | minimal | social-proof | urgency | premium",
      "headline": "YOUR GENERATED SHORT HEADLINE (max 6-8 words)",
      "subheadline": "Optional supporting text (max 10-12 words) or empty string",
      "cta": "${cta}",
      "prompt": "DETAILED prompt that describes: 1) The exact composition from reference (hand/background/layout), 2) The product, 3) The headline text in quotes, 4) The CTA. Must be 150+ words with specific visual details.",
      "textPlacement": "top | center | bottom | overlay",
      "colorScheme": "describe the color palette",
      "mood": "describe the emotional feel"
    }
  ]
}

CRITICAL RULES:
- Generate NEW short headlines (do NOT copy the creative brief)
- Each headline must be MAX 6-8 words
- Each variation must use a DIFFERENT angle
- All text must be in ${languageName}
- Every prompt must include the headline text in quotes for rendering
- Every prompt must specify aspect ratio: ${aspectRatio}
- The product from the reference image must be preserved exactly

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
        text: `\n\n═══ REFERENCE ADS - ANALYZE AND REPLICATE THIS STYLE ═══
Study these reference ads carefully. In your prompts, you MUST describe and replicate:
- Composition: Is there a hand/person holding the product? What's the framing?
- Background: What color/style? (beige, white, gradient, lifestyle scene?)
- Text layout: Where is text positioned? Bullet points? Single headline?
- Overall aesthetic: Minimal? Bold? Premium? Lifestyle?

DESCRIBE these elements explicitly in each prompt so the image generator copies them.` 
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
    const hasRefs = referenceImagesBase64 && referenceImagesBase64.length > 0;
    parts.push({
      text: `\n\n═══ NOW CREATE ${variations} VARIATIONS ═══
${hasRefs ? `FIRST: Analyze the reference ad(s) above. Describe the visual style:
- Is there a hand/person? What angle?
- Background color/style?
- Text placement and format?
- Overall mood/aesthetic?

Include this style description IN EACH PROMPT so the generator replicates it.
` : ''}
Use the creative brief "${headline}" as INSPIRATION only.

For each variation:
1. Pick a DIFFERENT angle (social-proof, benefit, pain-point, etc.)
2. Write a NEW SHORT headline (MAX 6-8 WORDS)
3. Create a detailed prompt that DESCRIBES the reference ad style + the new headline
4. Include CTA "${cta}" in the prompt

${hasRefs ? 'CRITICAL: Each prompt must explicitly describe: "A hand holding the product..." or "Product on beige background with bullet points to the right..." - whatever matches the reference.' : ''}

Remember: Short punchy headlines. Detailed style descriptions.
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
      
      // Ensure all variations have required fields (but keep AI-generated headlines)
      if (plan.variations) {
        plan.variations = plan.variations.map((v, i) => ({
          ...v,
          id: v.id || i + 1,
          headline: v.headline || headline,  // Keep AI-generated headline, fallback to user input
          cta: v.cta || cta,                 // Keep AI-generated CTA, fallback to user input
          aspectRatio: aspectRatio,
          creativeBrief: headline            // Store original brief for reference
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
