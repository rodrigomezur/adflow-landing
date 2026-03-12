// AdFlow - Generate from Scratch: Creative Director (SIMPLIFIED FOR DEBUG)

export default async function handler(req, res) {
  // Log start
  console.log('=== Plan API Called ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_KEY) {
    console.log('ERROR: No GEMINI_API_KEY');
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { productName, headline, cta, options = {} } = req.body;
    const { variations = 3, language = 'es' } = options;

    console.log('Input:', { productName, headline, cta, variations, language });

    if (!productName || !headline || !cta) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['productName', 'headline', 'cta']
      });
    }

    // Simple text-only prompt
    const prompt = `Create ${variations} ad variation prompts for an e-commerce product.

Product: ${productName}
Headline: ${headline}
CTA: ${cta}
Language: ${language === 'es' ? 'Spanish' : 'English'}

Return ONLY valid JSON in this format:
{
  "variations": [
    {
      "id": 1,
      "strategy": "hero-product",
      "headline": "headline text",
      "cta": "cta text",
      "prompt": "detailed image generation prompt",
      "negative_prompt": "what to avoid"
    }
  ]
}`;

    console.log('Calling Gemini...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      }
    );

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', errorText);
      return res.status(response.status).json({ 
        error: 'Gemini API error',
        details: errorText.substring(0, 500)
      });
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No text in response');
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    console.log('Gemini returned text, parsing JSON...');

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
      
    } catch (parseError) {
      console.error('Parse error:', parseError.message);
      return res.status(500).json({ 
        error: 'Failed to parse plan',
        details: parseError.message
      });
    }

    console.log('Success! Variations:', plan.variations?.length);

    return res.status(200).json({
      success: true,
      plan,
      meta: { productName, headline, cta, variations: plan.variations?.length }
    });

  } catch (error) {
    console.error('Unexpected error:', error.message, error.stack);
    return res.status(500).json({ 
      error: 'Failed to create plan',
      details: error.message
    });
  }
}
