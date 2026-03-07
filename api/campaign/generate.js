// Campaign Batch Generation
// Takes planned items (profiles + reference) and generates ads in batch

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FAL_KEY = process.env.FAL_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'FAL_API_KEY not configured' });
  }

  try {
    const {
      referenceImageUrl,    // Reference/template ad
      productImageUrl,      // Product image
      brandKit,             // { name, colors, font, description }
      profiles,             // Array of profiles to generate ads for
      aspectRatio,          // '1:1', '4:5', '9:16'
      adsPerProfile         // How many ads per profile (default 1)
    } = req.body;

    if (!referenceImageUrl || !profiles || profiles.length === 0) {
      return res.status(400).json({ 
        error: 'referenceImageUrl and profiles are required' 
      });
    }

    const results = [];
    const totalAds = profiles.length * (adsPerProfile || 1);
    
    console.log(`Starting batch generation: ${totalAds} ads across ${profiles.length} profiles`);

    // Process each profile
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const adsToGenerate = adsPerProfile || 1;

      for (let j = 0; j < adsToGenerate; j++) {
        const itemIndex = i * adsToGenerate + j;
        
        try {
          // Step 1: Compose prompt using Gemini (if available)
          let prompt;
          
          if (GEMINI_KEY) {
            // Use Gemini to compose a detailed prompt
            const composeResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `Create a detailed image generation prompt for a Facebook/Instagram static ad.

REFERENCE AD STYLE: ${referenceImageUrl}
${productImageUrl ? `PRODUCT IMAGE: ${productImageUrl}` : ''}

BRAND:
- Name: ${brandKit?.name || 'Brand'}
- Colors: Primary ${brandKit?.colors?.primary || '#000'}, Secondary ${brandKit?.colors?.secondary || '#FFF'}
- Font: ${brandKit?.font || 'Modern sans-serif'}

TARGET CUSTOMER PROFILE:
- Persona: ${profile.name || profile.persona_name}
- Pain Point: ${profile.painPoints?.[0] || profile.pain_points?.[0] || 'general concern'}
- Angle: ${profile.angle || profile.messaging_angle || 'benefit-focused'}
- Emotion: ${profile.emotion || profile.emotional_trigger || 'trust'}
- Visual Style: ${profile.visualDirection || profile.visual_style || 'professional'}

REQUIREMENTS:
1. Recreate the layout/structure of the reference ad
2. Use the brand colors and product image
3. Write headline copy that targets this specific customer profile's pain point
4. Match the visual style to this profile's preferences
5. Aspect ratio: ${aspectRatio || '1:1'}

Output ONLY the image generation prompt, nothing else. Be extremely specific about layout, colors, text placement, and exact copy.`
                    }]
                  }],
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                  }
                })
              }
            );

            if (composeResponse.ok) {
              const composeResult = await composeResponse.json();
              prompt = composeResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
          }

          // Fallback prompt if Gemini fails
          if (!prompt) {
            prompt = `Create a Facebook/Instagram static ad for ${brandKit?.name || 'Brand'}.

Style: Recreate the layout structure from a winning competitor ad.
Product: ${productImageUrl ? 'Use the provided product image prominently' : 'Feature the product'}
Target: ${profile.name || profile.persona_name || 'Customer'}
Pain point: ${profile.painPoints?.[0] || profile.pain_points?.[0] || 'their concerns'}
Emotion: ${profile.emotion || profile.emotional_trigger || 'trust'}
Visual: ${profile.visualDirection || profile.visual_style || 'professional'}
Colors: ${brandKit?.colors?.primary || '#000'} and ${brandKit?.colors?.secondary || '#FFF'}
Aspect ratio: ${aspectRatio || '1:1'}

Create a scroll-stopping ad that addresses this customer's specific concerns.`;
          }

          // Step 2: Generate image with Nano Banana
          const genResponse = await fetch('https://fal.run/fal-ai/nano-banana-2', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${FAL_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: prompt,
              aspect_ratio: aspectRatio || '1:1'
            })
          });

          if (!genResponse.ok) {
            throw new Error(`FAL API error: ${genResponse.status}`);
          }

          const genResult = await genResponse.json();
          const imageUrl = genResult.images?.[0]?.url || genResult.image?.url;

          results.push({
            index: itemIndex,
            status: 'success',
            profile: profile.name || profile.persona_name,
            imageUrl: imageUrl,
            prompt: prompt.substring(0, 500) + '...',
            angle: profile.angle || profile.messaging_angle
          });

          console.log(`Generated ${itemIndex + 1}/${totalAds}`);

        } catch (itemError) {
          console.error(`Error generating item ${itemIndex}:`, itemError);
          results.push({
            index: itemIndex,
            status: 'error',
            profile: profile.name || profile.persona_name,
            error: itemError.message
          });
        }
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    return res.status(200).json({
      success: true,
      summary: {
        total: totalAds,
        successful: successful,
        failed: failed
      },
      results: results
    });

  } catch (error) {
    console.error('Campaign generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate campaign',
      details: error.message 
    });
  }
}
