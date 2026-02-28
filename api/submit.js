// Vercel Serverless Function - AdFlow Lead Submission
// Saves to Supabase + Sends emails via Resend

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, website, monthly_spend, creative_setup, bottleneck } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // 1. Save to Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name,
        email,
        website,
        monthly_spend,
        creative_setup,
        bottleneck,
        status: 'new'
      })
    });

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Supabase error:', error);
      throw new Error('Failed to save lead');
    }

    // 2. Send confirmation email to applicant
    const resendKey = process.env.RESEND_API_KEY;

    // Email to applicant
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'AdFlow <onboarding@resend.dev>',
        to: email,
        subject: 'Application Received — AdFlow',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: bold; color: #080D1A; margin: 0;">
                Ad<span style="color: #C8FF00; background: #080D1A; padding: 2px 6px;">Flow</span>
              </h1>
            </div>
            
            <h2 style="font-size: 24px; color: #080D1A; margin-bottom: 16px;">Hey ${name.split(' ')[0]},</h2>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
              Thanks for applying to AdFlow. We've received your application and we're reviewing it now.
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
              <strong>What happens next?</strong><br>
              We'll review your application within 24 hours and reach out to schedule a quick call if AdFlow is a good fit for your brand.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #C8FF00; padding: 16px 20px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Your application summary:</strong><br>
                Website: ${website || 'Not provided'}<br>
                Monthly spend: ${monthly_spend || 'Not specified'}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Talk soon,<br>
              <strong>The AdFlow Team</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              AdFlow — Creative Velocity Infrastructure<br>
              You're receiving this because you applied at adflow-landing.vercel.app
            </p>
          </div>
        `
      })
    });

    // 3. Send notification to Rodrigo
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'AdFlow Leads <onboarding@resend.dev>',
        to: 'rgomez@leadifier.io',
        subject: `🚀 New AdFlow Application: ${name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; color: #080D1A; margin-bottom: 24px;">New AdFlow Application</h1>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; width: 140px;">Name</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">Website</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;"><a href="${website}" target="_blank">${website || 'Not provided'}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">Monthly Spend</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                  <span style="background: ${getSpendColor(monthly_spend)}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px;">
                    ${formatSpend(monthly_spend)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">Creative Setup</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${formatSetup(creative_setup)}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; vertical-align: top;">Bottleneck</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${bottleneck || 'Not provided'}</td>
              </tr>
            </table>
            
            <p style="font-size: 14px; color: #666;">
              View all leads in <a href="https://supabase.com/dashboard/project/ykmdpxtnmqkfcscmmjfv/editor/29453" target="_blank">Supabase Dashboard</a>
            </p>
          </div>
        `
      })
    });

    return res.status(200).json({ success: true, message: 'Application submitted successfully' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}

// Helper functions
function formatSpend(spend) {
  const labels = {
    'under-5k': 'Under $5K',
    '5k-15k': '$5K - $15K',
    '15k-30k': '$15K - $30K',
    '30k-50k': '$30K - $50K',
    '50k-plus': '$50K+'
  };
  return labels[spend] || spend || 'Not specified';
}

function getSpendColor(spend) {
  const colors = {
    'under-5k': '#999',
    '5k-15k': '#22c55e',
    '15k-30k': '#22c55e',
    '30k-50k': '#C8FF00',
    '50k-plus': '#C8FF00'
  };
  return colors[spend] || '#666';
}

function formatSetup(setup) {
  const labels = {
    'in-house': 'In-house team',
    'agency': 'Agency',
    'freelancers': 'Freelancers / Contractors',
    'myself': 'Does it themselves',
    'mix': 'Mix of the above'
  };
  return labels[setup] || setup || 'Not specified';
}
