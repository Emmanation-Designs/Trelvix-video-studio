export interface VideoModelOption {
  id: string; // e.g. 'sora-2-720p' | 'sora-2-pro-720p' | 'sora-2-pro-1024p' | 'sora-2-pro-1080p'
  model: 'sora-2' | 'sora-2-pro';
  displayName: string;
  qualityTier: string; // 'Standard' | 'Professional' | 'Higher Resolution' | 'Maximum Resolution'
  resolution: '720p' | '1024p' | '1080p';
  apiCostPerSecond: number; // USD per second
  creditsPerSecond: number; // credits per second
  supportedSeconds: number[]; // [4, 8, 12]
  supportedSizes: {
    landscape: string; // '1280x720', '1792x1024', or '1920x1080'
    portrait: string;  // '720x1280', '1024x1792', or '1080x1920'
  };
  enabled: boolean;
  description: string;
  badge?: string;
}

export const VIDEO_MODELS: VideoModelOption[] = [
  {
    id: 'sora-2-720p',
    model: 'sora-2',
    displayName: 'Sora 2 (720p)',
    qualityTier: 'Standard',
    resolution: '720p',
    apiCostPerSecond: 0.10,
    creditsPerSecond: 1.25, // 4s = 5 credits
    supportedSeconds: [4, 8, 12],
    supportedSizes: {
      landscape: '1280x720',
      portrait: '720x1280',
    },
    enabled: true,
    description: 'Fast, crisp standard video generation with OpenAI Sora 2 (720p)',
    badge: 'Popular',
  },
  {
    id: 'sora-2-pro-720p',
    model: 'sora-2-pro',
    displayName: 'Sora 2 Pro (720p)',
    qualityTier: 'Professional',
    resolution: '720p',
    apiCostPerSecond: 0.30,
    creditsPerSecond: 3.75, // 4s = 15 credits
    supportedSeconds: [4, 8, 12],
    supportedSizes: {
      landscape: '1280x720',
      portrait: '720x1280',
    },
    enabled: true,
    description: 'Professional quality, enhanced motion realism and physics with Sora 2 Pro',
  },
  {
    id: 'sora-2-pro-1024p',
    model: 'sora-2-pro',
    displayName: 'Sora 2 Pro (1024p)',
    qualityTier: 'Higher Resolution',
    resolution: '1024p',
    apiCostPerSecond: 0.50,
    creditsPerSecond: 6.25, // 4s = 25 credits
    supportedSeconds: [4, 8, 12],
    supportedSizes: {
      landscape: '1792x1024',
      portrait: '1024x1792',
    },
    enabled: true,
    description: 'Ultra detailed high resolution cinematic output with Sora 2 Pro',
    badge: 'Highest Detail',
  },
  {
    id: 'sora-2-pro-1080p',
    model: 'sora-2-pro',
    displayName: 'Sora 2 Pro (1080p)',
    qualityTier: 'Maximum Resolution',
    resolution: '1080p',
    apiCostPerSecond: 0.70,
    creditsPerSecond: 8.75, // 4s = 35 credits
    supportedSeconds: [4, 8, 12],
    supportedSizes: {
      landscape: '1920x1080',
      portrait: '1080x1920',
    },
    enabled: true,
    description: 'Maximum resolution broadcast quality output with Sora 2 Pro',
    badge: 'Broadcast Ultra',
  },
];

export interface VideoCreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  active: boolean;
  sort_order: number;
  badge?: string;
  pricePerCreditFormatted?: string;
  estimated_generations?: number;
}

export const OFFICIAL_CREDIT_PACKAGES: VideoCreditPackage[] = [
  { id: 'VIDEO_50', name: '50 Credits', credits: 50, price_usd: 7.99, active: true, sort_order: 1 },
  { id: 'VIDEO_100', name: '100 Credits', credits: 100, price_usd: 14.99, active: true, sort_order: 2 },
  { id: 'VIDEO_200', name: '200 Credits', credits: 200, price_usd: 27.99, active: true, sort_order: 3 },
  { id: 'VIDEO_300', name: '300 Credits', credits: 300, price_usd: 39.99, active: true, sort_order: 4 },
  { id: 'VIDEO_500', name: '500 Credits', credits: 500, price_usd: 59.99, active: true, sort_order: 5, badge: 'Popular' },
  { id: 'VIDEO_1000', name: '1,000 Credits', credits: 1000, price_usd: 119.99, active: true, sort_order: 6, badge: 'Best Value' },
  { id: 'VIDEO_2000', name: '2,000 Credits', credits: 2000, price_usd: 229.99, active: true, sort_order: 7 },
  { id: 'VIDEO_3000', name: '3,000 Credits', credits: 3000, price_usd: 329.99, active: true, sort_order: 8 },
  { id: 'VIDEO_5000', name: '5,000 Credits', credits: 5000, price_usd: 559.99, active: true, sort_order: 9, badge: 'Major Bulk Savings' },
  { id: 'VIDEO_7500', name: '7,500 Credits', credits: 7500, price_usd: 829.99, active: true, sort_order: 10 },
  { id: 'VIDEO_10000', name: '10,000 Credits', credits: 10000, price_usd: 1099.99, active: true, sort_order: 11, badge: 'Large Creator Package' },
  { id: 'VIDEO_15000', name: '15,000 Credits', credits: 15000, price_usd: 1649.99, active: true, sort_order: 12 },
  { id: 'VIDEO_20000', name: '20,000 Credits', credits: 20000, price_usd: 2199.99, active: true, sort_order: 13 },
  { id: 'VIDEO_30000', name: '30,000 Credits', credits: 30000, price_usd: 3199.99, active: true, sort_order: 14, badge: 'Maximum Bulk Package' },
];

export function findVideoModelConfig(optionIdOrModelName: string, resolution?: string): VideoModelOption {
  const normalized = (optionIdOrModelName || '').toLowerCase();
  const res = (resolution || '').toLowerCase();

  if (normalized.includes('1080') || res.includes('1080')) {
    return VIDEO_MODELS.find(m => m.id === 'sora-2-pro-1080p') || VIDEO_MODELS[3];
  }
  if (normalized.includes('1024') || res.includes('1024')) {
    return VIDEO_MODELS.find(m => m.id === 'sora-2-pro-1024p') || VIDEO_MODELS[2];
  }
  if (normalized.includes('pro') || normalized.includes('super')) {
    return VIDEO_MODELS.find(m => m.id === 'sora-2-pro-720p') || VIDEO_MODELS[1];
  }
  return VIDEO_MODELS.find(m => m.id === 'sora-2-720p') || VIDEO_MODELS[0];
}

export function calculateRequiredCredits(optionId: string, seconds: number, batchCount: number = 1): number {
  const config = findVideoModelConfig(optionId);
  const validSeconds = config.supportedSeconds.includes(seconds) ? seconds : 4;
  const singleCost = Math.round(config.creditsPerSecond * validSeconds);
  return singleCost * Math.max(1, batchCount);
}

export function calculateApiCost(optionId: string, seconds: number, batchCount: number = 1): number {
  const config = findVideoModelConfig(optionId);
  const validSeconds = config.supportedSeconds.includes(seconds) ? seconds : 4;
  return Number((config.apiCostPerSecond * validSeconds * Math.max(1, batchCount)).toFixed(2));
}

export function resolveOpenAiSize(optionId: string, aspectRatioOrOrientation: string): string {
  const config = findVideoModelConfig(optionId);
  const isPortrait = aspectRatioOrOrientation === '9:16' || aspectRatioOrOrientation === 'portrait';
  return isPortrait ? config.supportedSizes.portrait : config.supportedSizes.landscape;
}

export function getFormattedPackages(): (VideoCreditPackage & {
  pricePerCredit: number;
  pricePerCreditFormatted: string;
  soraGens: number;
  bestValue?: boolean;
})[] {
  const baseGenCost = 5; // 5 credits per 4s Sora 2 clip
  return OFFICIAL_CREDIT_PACKAGES.map((pkg) => {
    const pricePerCredit = pkg.price_usd / pkg.credits;
    return {
      ...pkg,
      pricePerCredit,
      pricePerCreditFormatted: `$${pricePerCredit.toFixed(4)}`,
      soraGens: Math.floor(pkg.credits / baseGenCost),
      estimated_generations: Math.floor(pkg.credits / baseGenCost),
      bestValue: pkg.badge === 'Best Value',
    };
  });
}

export function calculateCostAnalysis(
  optionId: string,
  seconds: number,
  batchCount: number = 1,
  packagePriceUsd: number = 559.99,
  packageCredits: number = 5000,
  paymentPercentage: number = 0.0349,
  fixedFee: number = 0.49
) {
  const config = findVideoModelConfig(optionId);
  const validSeconds = config.supportedSeconds.includes(seconds) ? seconds : 4;
  const count = Math.max(1, batchCount);
  
  const estimatedGenerationCost = calculateApiCost(optionId, validSeconds, count);
  const creditsConsumed = calculateRequiredCredits(optionId, validSeconds, count);
  
  // Payment processing cost = package_price * percentage + fixed_fee
  const paymentCost = Number((packagePriceUsd * paymentPercentage + fixedFee).toFixed(2));
  
  // Implied package revenue for this specific generation: (creditsConsumed / packageCredits) * packagePriceUsd
  const generationRevenue = Number(((creditsConsumed / packageCredits) * packagePriceUsd).toFixed(2));
  
  // Gross Margin Before Infrastructure = package_price - payment_cost - estimated_generation_cost
  const grossMarginBeforeInfrastructure = Number(
    (packagePriceUsd - paymentCost - (estimatedGenerationCost * (packageCredits / creditsConsumed))).toFixed(2)
  );

  return {
    modelId: config.id,
    modelName: config.displayName,
    seconds: validSeconds,
    batchCount: count,
    apiCost: estimatedGenerationCost,
    creditsConsumed,
    packagePriceUsd,
    packageCredits,
    paymentCost,
    generationRevenue,
    grossMarginBeforeInfrastructure,
  };
}
