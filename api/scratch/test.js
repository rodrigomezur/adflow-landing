// Simple test endpoint to debug the issue

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    // Log what we received
    console.log('=== Test Endpoint ===');
    console.log('Body keys:', Object.keys(body || {}));
    console.log('productName:', body?.productName);
    console.log('headline:', body?.headline);
    console.log('productImageUrl length:', body?.productImageUrl?.length || 0);
    console.log('referenceUrls count:', body?.referenceUrls?.length || 0);
    
    // Check sizes
    const productSize = body?.productImageUrl?.length || 0;
    const refSizes = (body?.referenceUrls || []).map(r => r?.length || 0);
    
    return res.status(200).json({
      success: true,
      received: {
        productName: body?.productName,
        headline: body?.headline,
        cta: body?.cta,
        productImageSize: productSize,
        referenceCount: body?.referenceUrls?.length || 0,
        referenceSizes: refSizes,
        totalPayloadSize: JSON.stringify(body).length
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      message: error.message
    });
  }
}
