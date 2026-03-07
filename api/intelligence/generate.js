// Generate Brand Intelligence Profiles from Deep Research
// Takes research report → outputs customer profiles/avatars

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
      brandName,
      brandDescription,
      researchReport,      // Deep research text about brand/market
      numProfiles          // Number of profiles to generate (default 10)
    } = req.body;

    if (!brandName) {
      return res.status(400).json({ error: 'brandName is required' });
    }

    const systemPrompt = `You are an expert at analyzing brand research and creating customer personas/profiles for advertising.

Based on the research provided, create detailed customer profiles that can be used to target different ad messaging.

Each profile should represent a distinct customer segment with unique pain points, motivations, and emotional triggers.

Output in JSON format:
{
  "profiles": [
    {
      "name": "Profile name (e.g., 'Skeptical First-Time Buyer')",
      "description": "Brief description of this customer segment",
      "painPoints": ["Pain point 1", "Pain point 2"],
      "desires": ["What they want 1", "What they want 2"],
      "objections": ["Why they might not buy"],
      "angle": "The messaging angle that resonates with them",
      "emotion": "Primary emotion to target (trust, excitement, relief, etc.)",
      "visualDirection": "Visual style that appeals to them (UGC, premium, minimal, etc.)",
      "copyHooks": ["Example headline 1", "Example headline 2"],
      "source": "ai_generated"
    }
  ]
}

Generate diverse profiles covering different customer segments:
- New customers vs returning
- Price-conscious vs premium-seeking
- Skeptics vs enthusiasts
- Problem-aware vs solution-aware
- Different demographics/psychographics`;

    const userPrompt = `Analyze this brand and research to create ${numProfiles || 10} distinct customer profiles for ad targeting.

BRAND: ${brandName}
${brandDescription ? `DESCRIPTION: ${brandDescription}` : ''}

${researchReport ? `RESEARCH REPORT:
${researchReport}` : 'No research report provided - generate profiles based on typical customer segments for this type of brand.'}

Create ${numProfiles || 10} unique customer profiles. Each should have distinct pain points and require different messaging approaches.

Make the profiles specific and actionable for ad creation.`;

    // Call Gemini API (using 1.5-flash for better quota handling)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
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
            temperature: 0.8,
            maxOutputTokens: 8192
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
    let profiles;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profiles = JSON.parse(jsonMatch[0]);
      } else {
        profiles = { rawOutput: textContent };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      profiles = { rawOutput: textContent };
    }

    return res.status(200).json({
      success: true,
      brandName: brandName,
      profiles: profiles.profiles || [],
      model: 'gemini-pro'
    });

  } catch (error) {
    console.error('Profile generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate profiles',
      details: error.message 
    });
  }
}
