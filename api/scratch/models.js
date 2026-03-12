// List available Gemini models

export default async function handler(req, res) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    // Filter to only show generateContent capable models
    const models = data.models?.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    ).map(m => ({
      name: m.name,
      displayName: m.displayName,
      methods: m.supportedGenerationMethods
    }));
    
    return res.status(200).json({ 
      count: models?.length || 0,
      models 
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
