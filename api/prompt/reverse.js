// Reverse Engineer Winning Ads
// Analyzes a winning ad and outputs style prompt + variant prompts

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
      imageUrl,             // URL of the winning ad to analyze
      brandName,            // Our brand name (to avoid in output)
      numVariants           // Number of variant prompts to generate (default 5)
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const systemPrompt = `You are an expert at analyzing successful Facebook/Instagram static ads and reverse-engineering them into reusable prompts.

IMPORTANT RULES:
- Never include competitor brand names in your output
- Never copy exact claims or statistics
- Focus on the STRUCTURE, LAYOUT, and VISUAL STYLE
- Create prompts that can be adapted for any brand

Your task is to analyze the ad and output:
1. A base style prompt that captures the layout/structure
2. A copy skeleton (placeholder text structure)
3. Multiple variant prompts for different angles

Output in JSON format:
{
  "adType": "Type of ad (UGC, before-after, testimonial, etc.)",
  "layoutAnalysis": {
    "structure": "Description of the layout structure",
    "textPlacement": "Where text elements are positioned",
    "productPlacement": "Where/how product is shown",
    "colorScheme": "Colors used",
    "visualStyle": "Overall aesthetic"
  },
  "basePrompt": "The main prompt to recreate this ad structure",
  "copySkeleton": {
    "headline": "Template for headline with [PLACEHOLDERS]",
    "subheadline": "Template for subheadline",
    "cta": "Template for CTA"
  },
  "variantPrompts": [
    {
      "angle": "Name of the angle (e.g., 'Social Proof')",
      "targetEmotion": "The emotion this targets",
      "prompt": "Full prompt for this variant"
    }
  ]
}`;

    const userPrompt = `Analyze this winning Facebook/Instagram ad and reverse-engineer it:

AD IMAGE URL: ${imageUrl}

${brandName ? `My brand is "${brandName}" - do NOT include competitor brand names in the output, use generic placeholders instead.` : 'Do NOT include any specific brand names in the output.'}

Generate ${numVariants || 5} variant prompts, each targeting a different angle:
1. Social proof / testimonial angle
2. Pain point / problem-solution angle
3. Benefit-focused angle
4. Urgency / scarcity angle
5. Trust / credibility angle

Make each variant prompt specific enough to paste directly into an image generator.`;

    // Call Gemini API with vision
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { 
                inlineData: {
                  mimeType: "image/jpeg",
                  data: "" // Note: For URL-based images, we describe instead
                }
              },
              { text: `${userPrompt}\n\nNote: Please analyze the ad at this URL: ${imageUrl}` }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
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
    let analysis;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = { rawAnalysis: textContent };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      analysis = { rawAnalysis: textContent };
    }

    return res.status(200).json({
      success: true,
      analysis: analysis,
      sourceImage: imageUrl,
      model: 'gemini-pro'
    });

  } catch (error) {
    console.error('Reverse engineering error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze ad',
      details: error.message 
    });
  }
}
