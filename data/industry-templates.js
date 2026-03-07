// Industry Templates Data for AdFlow Creative Studio
// Extracted from claude-ads skill (AgriciDaniel/claude-ads)

const INDUSTRY_TEMPLATES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce / DTC',
    icon: '🛒',
    description: 'Online stores, DTC brands, product sales',
    platformMix: [
      { platform: 'Meta (FB/IG)', role: 'Primary', budget: '50-68%', why: 'Prospecting + Advantage+ Shopping Campaigns' },
      { platform: 'Google Shopping/PMax', role: 'Secondary', budget: '23-30%', why: 'High-intent product searches' },
      { platform: 'TikTok', role: 'Secondary', budget: '5-15%', why: 'Product discovery, UGC, TikTok Shop' },
      { platform: 'Email', role: 'Supporting', budget: '5%', why: 'Retention, repeat purchase' }
    ],
    creativeStrategy: [
      'UGC unboxing/review (Spark Ads ~3% CTR)',
      'Product demos showing product in use',
      'Before/after transformation content',
      'Price anchoring (was/now pricing)',
      'Social proof (review count, star ratings)',
      'Lifestyle imagery (product in context)'
    ],
    creativeVolume: {
      metaASC: '150+ creatives',
      metaStandard: '5+ per ad set',
      tiktok: '6+ per ad group',
      googlePMax: '20 images + 5 videos per asset group'
    },
    refreshCadence: '2-4 weeks',
    benchmarks: {
      metaCPC: '$0.70-$1.32',
      metaROAS: '2.19 (median), 4.52 (ASC)',
      googleROAS: '3.68',
      cpa: '$23.74 (median)'
    },
    kpiTargets: {
      month1: { roas: '2.0 (learning)', cpa: 'Baseline' },
      month3: { roas: '3.0', cpa: '-15%' },
      month6: { roas: '4.0+', cpa: '-25%' }
    },
    recommendedAdTypes: ['ugc-image', 'before-after', 'feature-callout', 'testimonial', 'big-callout'],
    pitfalls: [
      'Running PMax without optimized product feed',
      'Not segmenting products by margin tier',
      'Creative fatigue — not refreshing every 2-4 weeks',
      'Measuring platform ROAS without blended MER check'
    ]
  },

  saas: {
    id: 'saas',
    name: 'SaaS / Software',
    icon: '💻',
    description: 'Software products, free trials, demos',
    platformMix: [
      { platform: 'Google Search', role: 'Primary', budget: '35-45%', why: 'High-intent keyword capture (trial, demo, pricing)' },
      { platform: 'LinkedIn', role: 'Primary', budget: '30-40%', why: 'B2B audience targeting (job title, company)' },
      { platform: 'Meta', role: 'Secondary', budget: '15-25%', why: 'Retargeting, lookalikes, brand awareness' },
      { platform: 'YouTube', role: 'Testing', budget: '5-10%', why: 'Product demos, customer stories' }
    ],
    creativeStrategy: [
      'Product demos (30-60s screen recordings)',
      'Customer testimonials with specific metrics',
      'Comparison content (side-by-side features)',
      'Founder/CEO thought leadership content',
      'ROI calculators as lead magnets'
    ],
    creativeVolume: {
      linkedIn: 'TLA content weekly',
      google: '3+ responsive ads per ad group',
      meta: '5+ creatives for retargeting'
    },
    refreshCadence: '4-6 weeks',
    benchmarks: {
      googleCPC: '$4.50-$8.00',
      googleCPL: '$100-$200',
      linkedInCPC: '$5-$35 (TLA: $2.29-$4.14)',
      linkedInCPL: '$125'
    },
    kpiTargets: {
      month1: { pipeline: 'Tracking', mqlToSql: 'Baseline' },
      month3: { pipeline: '3x spend', mqlToSql: '+10%' },
      month6: { pipeline: '5x spend', mqlToSql: '+20%' }
    },
    recommendedAdTypes: ['us-vs-them', 'feature-callout', 'testimonial', 'pr-screenshot'],
    pitfalls: [
      'Optimizing for trial signups without tracking trial → paid',
      'Not excluding existing customers',
      'Running LinkedIn without Thought Leader Ads (3-5x more expensive)',
      'Same landing page for all funnel stages'
    ]
  },

  localService: {
    id: 'localService',
    name: 'Local Service',
    icon: '🏠',
    description: 'HVAC, plumbing, cleaning, home services',
    platformMix: [
      { platform: 'Google LSA', role: 'Primary', budget: '40-50%', why: 'Pay-per-lead, Google Guaranteed badge, cheapest CPL ($25-$75)' },
      { platform: 'Google Search', role: 'Primary', budget: '20-25%', why: 'High-intent local queries ("near me")' },
      { platform: 'Meta', role: 'Secondary', budget: '15-20%', why: 'Local awareness, retargeting, seasonal promos' },
      { platform: 'Microsoft/Bing', role: 'Testing', budget: '5-10%', why: 'Google import, older demographic' }
    ],
    creativeStrategy: [
      'Before/after photos (roofing, landscaping)',
      'Team/truck photos (builds trust)',
      'Video testimonials from local customers',
      'Offer-driven ("$50 off first service")',
      'Emergency messaging ("Same-day service")',
      'Review highlights from Google reviews'
    ],
    creativeVolume: {
      google: '3+ responsive ads per service',
      meta: '5+ creatives per location'
    },
    refreshCadence: 'Seasonal (quarterly)',
    benchmarks: {
      googleCPC: '$7.85-$30',
      googleCPL: '$90.92',
      lsaCPL: '$25-$75',
      roas: '5.0x'
    },
    kpiTargets: {
      month1: { cpl: 'Baseline', callVolume: 'Track' },
      month3: { cpl: 'Target +20%', callVolume: '+20%' },
      month6: { cpl: 'Target', callVolume: '+40%' }
    },
    recommendedAdTypes: ['before-after', 'testimonial', 'big-callout', 'ugc-image'],
    pitfalls: [
      'Under-investing in LSA (should be 40-50%)',
      'Targeting too wide a radius (30+ miles)',
      'No call tracking',
      'Running ads outside business hours'
    ]
  },

  b2bEnterprise: {
    id: 'b2bEnterprise',
    name: 'B2B Enterprise',
    icon: '🏢',
    description: 'Enterprise sales, ABM, long sales cycles',
    platformMix: [
      { platform: 'LinkedIn', role: 'Primary', budget: '40-55%', why: 'Decision-maker targeting, ABM' },
      { platform: 'Google Search', role: 'Secondary', budget: '25-35%', why: 'High-intent category queries' },
      { platform: 'ABM Display', role: 'Secondary', budget: '10-15%', why: 'Programmatic account-based targeting' },
      { platform: 'Meta', role: 'Supporting', budget: '5-10%', why: 'Retargeting, lookalikes' }
    ],
    creativeStrategy: [
      'Thought Leader Ads (exec-authored content)',
      'Customer case studies with metrics',
      'Industry research (gated lead magnets)',
      'Product demos (60-90s enterprise features)',
      'Webinar promotion'
    ],
    creativeVolume: {
      linkedIn: 'TLA weekly, standard monthly',
      google: '3+ responsive ads'
    },
    refreshCadence: '6-8 weeks',
    benchmarks: {
      linkedInCPC: '$5-$35 (TLA: $2.29-$4.14)',
      linkedInCPL: '$60-$150+',
      googleCPL: '$100-$200',
      pipelineRatio: '5-10x spend'
    },
    kpiTargets: {
      month1: { pipeline: 'Track', mqlToSql: 'Track' },
      month3: { pipeline: '5x spend', mqlToSql: '15%+' },
      month6: { pipeline: '8x spend', mqlToSql: '25%+' }
    },
    recommendedAdTypes: ['testimonial', 'pr-screenshot', 'us-vs-them', 'feature-callout'],
    pitfalls: [
      'Optimizing for MQL volume instead of pipeline',
      'LinkedIn targeting too narrow (<50K audience)',
      'Not using Thought Leader Ads',
      'Same content for all buyer stages'
    ]
  },

  infoProducts: {
    id: 'infoProducts',
    name: 'Info Products / Courses',
    icon: '📚',
    description: 'Online courses, coaching, digital products',
    platformMix: [
      { platform: 'Meta (FB/IG)', role: 'Primary', budget: '35-40%', why: 'Interest targeting, video-heavy, retargeting' },
      { platform: 'YouTube', role: 'Primary', budget: '35-40%', why: 'Long-form content, VSL pre-rolls' },
      { platform: 'Email', role: 'Supporting', budget: '15-20%', why: 'Nurture sequences, launch campaigns' },
      { platform: 'TikTok', role: 'Testing', budget: '5-10%', why: 'Education content, organic amplification' }
    ],
    creativeStrategy: [
      'Founder-to-camera video (authentic, story-driven)',
      'Student testimonials with specific results',
      'Free value content (teach then pitch)',
      'Webinar/challenge ads',
      'Before/after transformation stories',
      'UGC-style casual testimonials'
    ],
    creativeVolume: {
      meta: '10+ creatives per campaign',
      youtube: '5+ video variations',
      tiktok: '10+ native-style videos'
    },
    refreshCadence: '2-4 weeks',
    benchmarks: {
      metaCPL: '$2-$8 (lead magnet)',
      metaCPA: '$5-$15 (tripwire), $30-$100 (core offer)',
      youtubeCPV: '$0.02-$0.10',
      targetROAS: '3-5x blended'
    },
    kpiTargets: {
      month1: { cpl: '<$8', frontEndROAS: '1.0 (break even)' },
      month3: { cpl: '<$5', frontEndROAS: '1.5' },
      month6: { cpl: '<$4', blendedROAS: '5.0+' }
    },
    recommendedAdTypes: ['ugc-image', 'testimonial', 'before-after', 'notes-app'],
    pitfalls: [
      'Spending on cold traffic without lead magnet warm-up',
      'Not tracking backend revenue (upsells, email sales)',
      'Same creative for 60+ days (fatigue)',
      'Over-promising in ad copy (refunds, policy violations)'
    ]
  },

  mobileApp: {
    id: 'mobileApp',
    name: 'Mobile App',
    icon: '📱',
    description: 'App installs, subscriptions, in-app purchases',
    platformMix: [
      { platform: 'Apple Search Ads', role: 'Primary', budget: '25-30%', why: 'High-intent App Store searches, best CVR' },
      { platform: 'Google App (UAC)', role: 'Primary', budget: '25-30%', why: 'Cross-network reach (Search, Play, YouTube)' },
      { platform: 'Meta App Installs', role: 'Primary', budget: '20-25%', why: 'Precise targeting, Advantage+ App Campaigns' },
      { platform: 'TikTok', role: 'Secondary', budget: '15-20%', why: 'High engagement, young demographics, low CPM' }
    ],
    creativeStrategy: [
      'App demo videos (15-30s core functionality)',
      'Screen recordings with finger taps/swipes',
      'UGC reactions (users discovering the app)',
      'Problem → solution format',
      'Social proof ("10M+ downloads")',
      'Before/after (life without vs with app)'
    ],
    creativeVolume: {
      meta: 'Multiple aspect ratios (9:16 + 1:1)',
      googleUAC: '20+ creative assets',
      tiktok: '10+ native-looking videos'
    },
    refreshCadence: '2-3 weeks',
    benchmarks: {
      metaCPI: '$3-$8 (iOS), $1-$4 (Android)',
      googleCPI: '$1-$5',
      appleCPI: '$2-$5',
      tiktokCPI: '$1-$3'
    },
    kpiTargets: {
      month1: { cpi: 'Baseline', d1Retention: 'Track' },
      month3: { cpi: '-20%', d1Retention: '30%+' },
      month6: { cpi: '-30%', ltvCpiRatio: '3:1+' }
    },
    recommendedAdTypes: ['ugc-image', 'before-after', 'feature-callout', 'notes-app'],
    pitfalls: [
      'Optimizing for installs instead of post-install events',
      'Not using an MMP (Mobile Measurement Partner)',
      'Same creative for iOS and Android',
      'Budget too low for Google UAC (<$50/day)'
    ]
  }
};

// Ad Types Data
const AD_TYPES = {
  'before-after': {
    id: 'before-after',
    name: 'Before & After',
    icon: '🔄',
    description: 'Transformation visual showing results',
    bestFor: ['supplements', 'skincare', 'fitness', 'home services'],
    subtypes: ['Split horizontal', 'Timeline progressive', 'Emotional contrast']
  },
  'big-callout': {
    id: 'big-callout',
    name: 'Big Call-Out',
    icon: '📢',
    description: 'Large message, readable in 0.3 seconds',
    bestFor: ['sales', 'offers', 'urgency', 'price anchoring'],
    subtypes: ['Direct offer', 'Benefit claim', 'Disruptive question']
  },
  'feature-callout': {
    id: 'feature-callout',
    name: 'Feature / Benefit Callout',
    icon: '✨',
    description: '3-6 key points with product shot',
    bestFor: ['products', 'software', 'tech', 'supplements'],
    subtypes: ['Arrow infographic', 'Benefit grid', 'Badge layout']
  },
  'us-vs-them': {
    id: 'us-vs-them',
    name: 'Us vs Them',
    icon: '⚔️',
    description: 'Competitive comparison',
    bestFor: ['saas', 'supplements', 'any differentiated product'],
    subtypes: ['Checkmark table', 'Side-by-side', 'Which would you choose']
  },
  'testimonial': {
    id: 'testimonial',
    name: 'Testimonial Static',
    icon: '💬',
    description: 'Customer review or DM screenshot',
    bestFor: ['social proof', 'trust building', 'all industries'],
    subtypes: ['Quote card', 'Review overlay', 'DM screenshot']
  },
  'pr-screenshot': {
    id: 'pr-screenshot',
    name: 'PR / Press Screenshot',
    icon: '📰',
    description: 'Media mention for instant credibility',
    bestFor: ['authority', 'trust', 'premium brands'],
    subtypes: ['Article mockup', 'Trending badge', 'As Seen In']
  },
  'notes-app': {
    id: 'notes-app',
    name: 'Notes App / Sticky Note',
    icon: '📝',
    description: 'High CTR pattern interrupt format',
    bestFor: ['discovery angle', 'authentic feel', 'any product'],
    subtypes: ['Sticky note overlay', 'Notes app screenshot', 'Handwritten']
  },
  'ugc-image': {
    id: 'ugc-image',
    name: 'UGC Image',
    icon: '🤳',
    description: 'Creator posing with product',
    bestFor: ['authenticity', 'relatability', 'all DTC brands'],
    subtypes: ['Selfie with product', 'Lifestyle shot', 'Reaction face']
  }
};

// Export for use in admin panel
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INDUSTRY_TEMPLATES, AD_TYPES };
}
