// Serverless function to call fal.ai API securely
// Using Nano Banana 2 / Nano Banana Pro for ad creative generation

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment
  const FAL_KEY = process.env.FAL_API_KEY;
  
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'FAL_API_KEY not configured' });
  }

  try {
    const { prompt, width, height, image_url, aspect_ratio } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Determine aspect ratio string for Nano Banana
    let aspectRatioStr = "1:1";
    if (aspect_ratio) {
      aspectRatioStr = aspect_ratio;
    } else if (width && height) {
      if (width === height) aspectRatioStr = "1:1";
      else if (height > width) aspectRatioStr = "9:16";
      else aspectRatioStr = "16:9";
    }

    let response;
    let endpoint;
    let requestBody;

    // If product image provided, use edit endpoint for better integration
    if (image_url) {
      endpoint = 'fal-ai/nano-banana-pro/edit';
      requestBody = {
        prompt: prompt,
        image_url: image_url,
        aspect_ratio: aspectRatioStr
      };
      console.log('Using Nano Banana Pro Edit with image reference');
    } else {
      // Text-to-image only
      endpoint = 'fal-ai/nano-banana-2';
      requestBody = {
        prompt: prompt,
        aspect_ratio: aspectRatioStr
      };
      console.log('Using Nano Banana 2 text-to-image');
    }

    console.log('Endpoint:', endpoint);
    console.log('Request:', JSON.stringify(requestBody, null, 2));

    // Call Nano Banana API
    response = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nano Banana error:', errorText);
      
      // Fallback to standard Nano Banana 2
      console.log('Falling back to nano-banana-2...');
      response = await fetch('https://fal.run/fal-ai/nano-banana-2', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: image_url 
            ? `Create this exact ad with this product prominently featured. Product reference: ${image_url}\n\n${prompt}`
            : prompt,
          aspect_ratio: aspectRatioStr
        })
      });
      
      if (!response.ok) {
        const fallbackError = await response.text();
        console.error('Fallback error:', fallbackError);
        return res.status(response.status).json({ 
          error: `API error: ${response.status}`,
          details: fallbackError
        });
      }
    }

    const result = await response.json();
    console.log('Generation successful');
    
    // Return the result
    return res.status(200).json(result);

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
}
