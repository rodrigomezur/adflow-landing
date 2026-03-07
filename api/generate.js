// Serverless function to call fal.ai API securely
// API key is stored in Vercel environment variables

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
    const { prompt, width, height, image_url, strength } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare fal.ai request
    const requestBody = {
      prompt: prompt,
      image_size: {
        width: width || 1024,
        height: height || 1024
      },
      num_images: 1,
      enable_safety_checker: false,
      safety_tolerance: "6"
    };

    // If product image provided, add as reference
    if (image_url) {
      requestBody.image_url = image_url;
      requestBody.strength = strength || 0.75;
    }

    // Call fal.ai API
    const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('fal.ai error:', errorText);
      return res.status(response.status).json({ 
        error: `fal.ai API error: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    
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
