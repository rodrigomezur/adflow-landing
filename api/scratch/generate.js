// AdFlow - Generate from Scratch: Image Generation
// Takes a single variation prompt and generates the ad image

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
      prompt,
      negative_prompt,
      productImageUrl,
      referenceUrls = [],
      aspectRatio = '4:5',
      variationId
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('=== Scratch Generate Request ===');
    console.log('Variation ID:', variationId);
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Prompt (first 100):', prompt.substring(0, 100));
    console.log('Has product image:', !!productImageUrl);
    console.log('Reference count:', referenceUrls.length);

    // Build image URLs array for Nano Banana Pro Edit
    // Product image first (most important for fidelity)
    const imageUrls = [];
    
    if (productImageUrl) {
      imageUrls.push(productImageUrl);
    }
    
    // Add up to 2 reference images for style guidance
    const refsToUse = referenceUrls.slice(0, 2);
    for (const refUrl of refsToUse) {
      if (refUrl && refUrl !== productImageUrl) {
        imageUrls.push(refUrl);
      }
    }

    // Enhance prompt with product fidelity instruction
    let enhancedPrompt = prompt;
    if (productImageUrl) {
      // Check if prompt already mentions product preservation
      if (!prompt.toLowerCase().includes('keep the product') && !prompt.toLowerCase().includes('product exactly')) {
        enhancedPrompt = `CRITICAL: Keep the product from the first reference image EXACTLY as it is - same shape, colors, details, branding, packaging. Do not modify, stylize, or reimagine the product. Only change the background, scene, context, and add text overlays.\n\n${prompt}`;
      }
    }

    // Valid aspect ratios for Nano Banana Pro Edit
    const validAspectRatios = ['21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];
    const finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '4:5';

    let endpoint;
    let requestBody;
    let response;

    // Strategy: Use image-to-image if we have reference images
    if (imageUrls.length > 0) {
      endpoint = 'fal-ai/nano-banana-pro/edit';
      requestBody = {
        prompt: enhancedPrompt,
        image_urls: imageUrls,
        aspect_ratio: finalAspectRatio,
        num_images: 1
      };
      
      console.log('Using Nano Banana Pro Edit');
      console.log('Image URLs:', imageUrls.length);
    } else {
      // Fallback to text-to-image
      endpoint = 'fal-ai/nano-banana-2';
      
      // Calculate image size from aspect ratio
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
          imageSize = { width: 1024, height: 1280 };
      }
      
      requestBody = {
        prompt: enhancedPrompt,
        negative_prompt: negative_prompt || "blurry, low quality, watermark, distorted",
        image_size: imageSize,
        num_images: 1
      };
      
      console.log('Using Nano Banana 2 (text-to-image fallback)');
    }

    // Call FAL API
    console.log('Calling FAL API:', endpoint);
    
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
      console.error('FAL API error:', errorText);
      
      // Try fallback to text-to-image if image-to-image failed
      if (endpoint.includes('edit')) {
        console.log('Image-to-image failed, trying text-to-image fallback...');
        
        const fallbackResponse = await fetch('https://fal.run/fal-ai/nano-banana-2', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: negative_prompt || "blurry, low quality, watermark",
            image_size: { width: 1024, height: 1280 },
            num_images: 1
          })
        });
        
        if (!fallbackResponse.ok) {
          const fallbackError = await fallbackResponse.text();
          console.error('Fallback also failed:', fallbackError);
          return res.status(500).json({ 
            error: 'Image generation failed',
            details: fallbackError
          });
        }
        
        response = fallbackResponse;
      } else {
        return res.status(500).json({ 
          error: 'Image generation failed',
          details: errorText
        });
      }
    }

    const result = await response.json();
    const imageUrl = result.images?.[0]?.url || result.image?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', JSON.stringify(result).substring(0, 500));
      return res.status(500).json({ error: 'No image in response' });
    }

    console.log('✓ Image generated:', imageUrl.substring(0, 80));

    return res.status(200).json({
      success: true,
      imageUrl,
      variationId,
      aspectRatio: finalAspectRatio,
      method: endpoint.includes('edit') ? 'image-to-image' : 'text-to-image'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
}
