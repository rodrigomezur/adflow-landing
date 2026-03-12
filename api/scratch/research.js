// AdFlow - Product Research Agent
// Scrapes product URL and extracts intelligence for better ad prompts

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { productUrl } = req.body;

    if (!productUrl) {
      return res.status(400).json({ error: 'productUrl is required' });
    }

    console.log('=== Product Research Agent ===');
    console.log('URL:', productUrl);

    // Step 1: Scrape the product page
    let pageContent = '';
    let pageTitle = '';
    
    try {
      console.log('Scraping product page...');
      const scrapeResponse = await fetch(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
      
      if (scrapeResponse.ok) {
        const html = await scrapeResponse.text();
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = titleMatch ? titleMatch[1].trim() : '';
        
        // Clean HTML to text
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 15000); // Limit for Gemini
          
        console.log('✓ Page scraped, content length:', pageContent.length);
      } else {
        console.log('Scrape failed with status:', scrapeResponse.status);
      }
    } catch (scrapeErr) {
      console.error('Scrape error:', scrapeErr.message);
    }

    if (!pageContent) {
      return res.status(400).json({ 
        error: 'Could not scrape product page',
        hint: 'The URL may be blocked or invalid'
      });
    }

    // Step 2: Analyze with Gemini
    console.log('Analyzing with Gemini...');
    
    const analysisPrompt = `You are a senior e-commerce marketing strategist. Analyze this product page and extract key information for creating high-converting Facebook/Instagram ads.

PAGE URL: ${productUrl}
PAGE TITLE: ${pageTitle}

PAGE CONTENT:
${pageContent}

═══════════════════════════════════════════════════════════════
EXTRACT AND RETURN JSON:
═══════════════════════════════════════════════════════════════
{
  "productName": "exact product name",
  "brand": "brand name if found",
  "category": "product category (skincare, supplements, fashion, tech, etc.)",
  "price": "price if found",
  "currency": "USD/MXN/EUR etc",
  
  "coreBenefit": "the #1 main benefit in one sentence",
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "painPoints": ["problem it solves 1", "problem 2", "problem 3"],
  
  "targetAudience": {
    "demographics": "age, gender if clear",
    "psychographics": "lifestyle, values, interests"
  },
  
  "socialProof": {
    "hasReviews": true/false,
    "reviewHighlights": ["key quote 1", "key quote 2"],
    "trustSignals": ["FDA approved", "10,000+ sold", etc.]
  },
  
  "uniqueSellingPoints": ["what makes it different 1", "USP 2"],
  
  "suggestedHeadlines": [
    "Compelling headline option 1",
    "Compelling headline option 2", 
    "Compelling headline option 3"
  ],
  
  "suggestedAngles": [
    {
      "angle": "Problem-Solution",
      "headline": "headline for this angle",
      "hook": "opening hook"
    },
    {
      "angle": "Social Proof",
      "headline": "headline for this angle",
      "hook": "opening hook"
    },
    {
      "angle": "Transformation",
      "headline": "headline for this angle",
      "hook": "opening hook"
    }
  ],
  
  "visualRecommendations": {
    "style": "minimal/bold/luxury/playful/clinical",
    "colors": ["suggested color 1", "color 2"],
    "mood": "describe the ideal visual mood"
  },
  
  "adCopyElements": {
    "primaryText": "suggested primary text for ad",
    "callToAction": "best CTA"
  }
}

Be specific and actionable. If something isn't clear from the page, make educated guesses based on the product category.
Return ONLY valid JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Analysis failed',
        details: errorText.substring(0, 300)
      });
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({ error: 'No analysis from Gemini' });
    }

    // Parse JSON
    let intelligence;
    try {
      let cleanedText = textContent.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      
      intelligence = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Parse error:', parseErr.message);
      return res.status(500).json({ 
        error: 'Failed to parse intelligence',
        rawPreview: textContent.substring(0, 300)
      });
    }

    console.log('✓ Intelligence extracted for:', intelligence.productName);

    return res.status(200).json({
      success: true,
      url: productUrl,
      intelligence,
      pageTitle
    });

  } catch (error) {
    console.error('Research error:', error);
    return res.status(500).json({ 
      error: 'Research failed',
      details: error.message 
    });
  }
}
