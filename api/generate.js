// Serverless function to call fal.ai API securely
// Using Nano Banana 2 with structured JSON prompts

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FAL_KEY = process.env.FAL_API_KEY;
  
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'FAL_API_KEY not configured' });
  }

  try {
    const { 
      // New structured JSON prompt format
      jsonPrompt,
      // Legacy format (still supported)
      prompt, 
      negative_prompt,
      image_url, 
      product_url,
      aspect_ratio,
      width,
      height
    } = req.body;

    // Handle both new JSON format and legacy format
    let finalPrompt, finalNegativePrompt, finalAspectRatio, finalSettings;
    
    if (jsonPrompt) {
      // New structured JSON prompt from Gemini
      finalPrompt = jsonPrompt.prompt;
      finalNegativePrompt = jsonPrompt.negative_prompt || "blurry, low quality, distorted, watermark, cartoon, plastic skin";
      finalSettings = jsonPrompt.settings || {};
      finalAspectRatio = finalSettings.aspect_ratio || aspect_ratio || "4:5";
      
      // Enhance prompt with camera/lighting settings if available
      if (finalSettings.lighting) {
        finalPrompt += `. Lighting: ${finalSettings.lighting}`;
      }
      if (finalSettings.camera?.lens) {
        finalPrompt += `. Shot on ${finalSettings.camera.lens} lens`;
      }
      if (finalSettings.camera?.depth_of_field) {
        finalPrompt += `, ${finalSettings.camera.depth_of_field} depth of field`;
      }
      if (finalSettings.color_grading) {
        finalPrompt += `. ${finalSettings.color_grading} color grading`;
      }
      if (finalSettings.style) {
        finalPrompt += `. Style: ${finalSettings.style}`;
      }
      
      console.log('Using structured JSON prompt');
    } else {
      // Legacy plain text prompt
      finalPrompt = prompt;
      finalNegativePrompt = negative_prompt || "blurry, low quality, distorted, watermark, cartoon, plastic skin";
      finalAspectRatio = aspect_ratio || "4:5";
      
      console.log('Using legacy plain text prompt');
    }

    if (!finalPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Determine resolution based on aspect ratio
    let imageSize;
    switch (finalAspectRatio) {
      case '1:1':
        imageSize = { width: 1024, height: 1024 };
        break;
      case '4:5':
        imageSize = { width: 1024, height: 1280 };
        break;
      case '9:16':
        imageSize = { width: 768, height: 1344 };
        break;
      case '16:9':
        imageSize = { width: 1344, height: 768 };
        break;
      default:
        imageSize = { width: 1024, height: 1280 }; // Default to 4:5
    }

    // Build request for Nano Banana 2
    const requestBody = {
      prompt: finalPrompt,
      negative_prompt: finalNegativePrompt,
      image_size: imageSize,
      num_images: 1,
      seed: Math.floor(Math.random() * 1000000) // Random seed for variety
    };

    console.log('Prompt (first 200 chars):', finalPrompt.substring(0, 200));
    console.log('Negative prompt:', finalNegativePrompt.substring(0, 100));
    console.log('Image size:', imageSize);

    // Try Nano Banana 2 first (better quality, supports negative prompts)
    let response = await fetch('https://fal.run/fal-ai/nano-banana-2', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nano Banana 2 error:', errorText);
      
      // Try with image reference if provided
      if (image_url || product_url) {
        console.log('Trying Nano Banana Pro Edit with image reference...');
        
        const editRequestBody = {
          prompt: finalPrompt,
          image_url: image_url || product_url,
          aspect_ratio: finalAspectRatio
        };
        
        response = await fetch('https://fal.run/fal-ai/nano-banana-pro/edit', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editRequestBody)
        });
        
        if (!response.ok) {
          const editError = await response.text();
          console.error('Nano Banana Pro Edit error:', editError);
          return res.status(response.status).json({ 
            error: `API error: ${response.status}`,
            details: editError
          });
        }
      } else {
        return res.status(response.status).json({ 
          error: `API error: ${response.status}`,
          details: errorText
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
