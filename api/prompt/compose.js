// Prompt Composition using Gemini API
// Takes reference ad, product, brand context → outputs detailed generation prompt

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
      campaignGoal,         // optional campaign objective
      aspectRatio           // '1:1', '4:5', '9:16'
    } = req.body;

    if (!referenceImageUrl) {
      return res.status(400).json({ error: 'referenceImageUrl is required' });
    }

    // Build the prompt for Gemini
    const systemPrompt = `You are an expert at analyzing Facebook/Instagram static ads and creating detailed image generation prompts.

Your task is to analyze a reference ad and create a detailed prompt that:
1. Recreates the exact layout, structure, and visual style of the reference
2. Replaces the competitor's product with the client's product
3. Rewrites all text/copy to target the specified customer profile
4. Uses the client's brand colors and font
5. Maintains the same visual hierarchy

Output your prompt in JSON format with these fields:
{
  "prompt": "The detailed image generation prompt",
  "headline": "The main headline text to appear on the ad",
  "subheadline": "Secondary text if applicable",
  "cta": "Call to action text",
  "layoutDescription": "Brief description of the layout",
  "colorScheme": "Colors to use",
  "textPlacement": "Where text should be positioned"
}

Be EXTREMELY specific about every visual element. Spell out every word of text that should appear.`;

    const userPrompt = `Analyze this reference ad and create a detailed image generation prompt.

REFERENCE AD: ${referenceImageUrl}
${productImageUrl ? `PRODUCT IMAGE: ${productImageUrl}` : ''}

BRAND INFORMATION:
- Brand Name: ${brandKit?.name || 'Brand'}
- Primary Color: ${brandKit?.colors?.primary || '#000000'}
- Secondary Color: ${brandKit?.colors?.secondary || '#FFFFFF'}
- Accent Color: ${brandKit?.colors?.accent || '#FF0000'}
- Font Style: ${brandKit?.font || 'Modern sans-serif'}
- Brand Description: ${brandKit?.description || ''}

${profile ? `TARGET CUSTOMER PROFILE:
- Persona: ${profile.persona}
- Pain Point: ${profile.painPoint}
- Angle: ${profile.angle}
- Emotion to Convey: ${profile.emotion}
- Visual Direction: ${profile.visualDirection || 'authentic'}` : ''}

${campaignGoal ? `CAMPAIGN GOAL: ${campaignGoal}` : ''}

ASPECT RATIO: ${aspectRatio || '1:1'}

Create a detailed, specific prompt that I can paste directly into Nano Banana Pro.
The prompt should recreate the reference ad's structure but with this brand's product and messaging targeting this customer profile.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
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
            maxOutputTokens: 2048
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

    // Try to parse JSON from response
    let parsedPrompt;
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedPrompt = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: use the raw text as prompt
        parsedPrompt = {
          prompt: textContent,
          headline: '',
          subheadline: '',
          cta: '',
          layoutDescription: '',
          colorScheme: '',
          textPlacement: ''
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedPrompt = {
        prompt: textContent,
        headline: '',
        subheadline: '',
        cta: '',
        layoutDescription: '',
        colorScheme: '',
        textPlacement: ''
      };
    }

    return res.status(200).json({
      success: true,
      composedPrompt: parsedPrompt,
      model: 'gemini-pro',
      rawResponse: textContent
    });

  } catch (error) {
    console.error('Prompt composition error:', error);
    return res.status(500).json({ 
      error: 'Failed to compose prompt',
      details: error.message 
    });
  }
}
