// Serverless function to call fal.ai API securely
// Using Nano Banana 2 for ad creative generation

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
    if (width && height) {
      if (width === height) aspectRatioStr = "1:1";
      else if (height > width) aspectRatioStr = "9:16";
      else aspectRatioStr = "16:9";
    }
    if (aspect_ratio) aspectRatioStr = aspect_ratio;

    // Prepare Nano Banana 2 request
    const requestBody = {
      prompt: prompt,
      negative_prompt: "blurry, low quality, distorted, watermark, signature, text errors, misspelled",
      num_images: 1,
      aspect_ratio: aspectRatioStr,
      output_format: "png"
    };

    // If product image provided, add as reference image
    if (image_url) {
      requestBody.reference_images = [
        {
          image_url: image_url,
          weight: 0.85
        }
      ];
    }

    console.log('Calling Nano Banana 2 with:', JSON.stringify(requestBody, null, 2));

    // Call Nano Banana 2 API
    const response = await fetch('https://fal.run/fal-ai/imagen4/preview', {
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
      
      // Try alternative model if first fails
      console.log('Trying alternative model...');
      const altResponse = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: { width: width || 1024, height: height || 1024 },
          num_images: 1
        })
      });
      
      if (!altResponse.ok) {
        const altError = await altResponse.text();
        return res.status(altResponse.status).json({ 
          error: `API error: ${altResponse.status}`,
          details: altError
        });
      }
      
      const altResult = await altResponse.json();
      return res.status(200).json(altResult);
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
