// Serverless function to call fal.ai API securely
// Using Nano Banana 2 / Nano Banana Pro for ad creative generation

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
      jsonPrompt,           // Structured JSON prompt from Gemini
      prompt,               // Legacy: plain text prompt
      negative_prompt,      // Negative prompt
      reference_image_url,  // Reference ad for image-to-image
      product_image_url,    // Product image
      image_url,            // Legacy: any reference image
      aspect_ratio,
      use_image_to_image    // Force image-to-image mode
    } = req.body;

    // Extract prompt and settings from JSON or use legacy format
    let finalPrompt, finalNegativePrompt, finalAspectRatio;
    
    if (jsonPrompt) {
      finalPrompt = jsonPrompt.prompt;
      finalNegativePrompt = jsonPrompt.negative_prompt || "blurry, low quality, watermark, cartoon, plastic skin";
      finalAspectRatio = jsonPrompt.settings?.aspect_ratio || aspect_ratio || "4:5";
      
      // Append camera/lighting settings to prompt
      const settings = jsonPrompt.settings || {};
      if (settings.lighting) {
        finalPrompt += `. ${settings.lighting} lighting`;
      }
      if (settings.camera?.lens) {
        finalPrompt += `. Shot on ${settings.camera.lens} lens`;
      }
      if (settings.camera?.depth_of_field) {
        finalPrompt += `, ${settings.camera.depth_of_field} depth of field`;
      }
      if (settings.color_grading) {
        finalPrompt += `. ${settings.color_grading} color grading`;
      }
    } else {
      finalPrompt = prompt;
      finalNegativePrompt = negative_prompt || "blurry, low quality, watermark, cartoon";
      finalAspectRatio = aspect_ratio || "4:5";
    }

    if (!finalPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Determine image size based on aspect ratio
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

    // Determine which reference image to use
    const refImage = reference_image_url || image_url;
    
    console.log('=== Generation Request ===');
    console.log('Aspect ratio:', finalAspectRatio);
    console.log('Image size:', imageSize);
    console.log('Prompt (first 200):', finalPrompt.substring(0, 200));
    console.log('Has reference image:', !!refImage);
    console.log('Has product image:', !!product_image_url);

    let response;
    let endpoint;
    let requestBody;

    // Strategy:
    // 1. If we have a reference image → use Nano Banana Pro Edit (image-to-image)
    // 2. Otherwise → use Nano Banana 2 (text-to-image)
    
    if ((refImage || product_image_url) && use_image_to_image !== false) {
      // Image-to-image mode using Nano Banana Pro Edit
      endpoint = 'fal-ai/nano-banana-pro/edit';
      
      // Build the image_urls array - product image should be FIRST for best results
      const imageUrls = [];
      if (product_image_url) {
        imageUrls.push(product_image_url);
      }
      if (refImage && refImage !== product_image_url) {
        imageUrls.push(refImage);
      }
      
      // Enhance prompt to instruct model to keep product identical
      let enhancedPrompt = finalPrompt;
      if (product_image_url) {
        enhancedPrompt = `IMPORTANT: Keep the product from the first reference image EXACTLY as it is - same shape, color, details, branding. Do not modify the product. Only change the background, scene, and context around it.\n\n${finalPrompt}`;
      }
      
      // IMPORTANT: Do NOT use "auto" - explicitly set the aspect ratio
      // Valid values: 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16
      const validAspectRatios = ['21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];
      const aspectRatioToUse = validAspectRatios.includes(finalAspectRatio) ? finalAspectRatio : '4:5';
      
      requestBody = {
        prompt: enhancedPrompt,
        image_urls: imageUrls,  // Use image_urls (plural, array) not image_url
        aspect_ratio: aspectRatioToUse,
        num_images: 1,
        limit_generations: true  // Prevent model from generating multiple variations
      };
      
      console.log('Using Nano Banana Pro Edit (image-to-image)');
      console.log('Forcing aspect ratio:', aspectRatioToUse);
      console.log('Image URLs:', imageUrls.length, 'images');
      console.log('Product image:', product_image_url?.substring(0, 80));
      console.log('Reference image:', refImage?.substring(0, 80));
      
    } else {
      // Text-to-image mode using Nano Banana 2
      endpoint = 'fal-ai/nano-banana-2';
      requestBody = {
        prompt: finalPrompt,
        negative_prompt: finalNegativePrompt,
        image_size: imageSize,
        num_images: 1
      };
      
      console.log('Using Nano Banana 2 (text-to-image)');
    }

    // Call FAL API
    console.log('Calling FAL API endpoint:', endpoint);
    
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
      
      // Fallback: try text-to-image if image-to-image failed
      if (endpoint.includes('edit')) {
        console.log('Image-to-image failed, falling back to text-to-image...');
        
        response = await fetch('https://fal.run/fal-ai/nano-banana-2', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            negative_prompt: finalNegativePrompt,
            image_size: imageSize,
            num_images: 1
          })
        });
        
        if (!response.ok) {
          const fallbackError = await response.text();
          console.error('Fallback also failed:', fallbackError);
          return res.status(response.status).json({ 
            error: `API error: ${response.status}`,
            details: fallbackError
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
    console.log('Generation successful!');
    
    // Verify aspect ratio of result
    const generatedImage = result.images?.[0] || result.image;
    if (generatedImage) {
      console.log('Generated image URL:', generatedImage.url?.substring(0, 80));
      if (generatedImage.width && generatedImage.height) {
        console.log('Generated dimensions:', generatedImage.width, 'x', generatedImage.height);
      }
    }
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
}
