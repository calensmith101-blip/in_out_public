export type SubscriptionAppId = 'inout' | 'all_apps'

export type SubscriptionPlan = {
  appId: SubscriptionAppId
  appName: string
  entitlement: string
  stripePriceEnv: string
  trialDays?: number
}

export const SUBSCRIPTIONS_REQUIRED = process.env.NEXT_PUBLIC_REQUIRE_SUBSCRIPTIONS === 'true'

export const SUBSCRIPTION_PLANS: Record<SubscriptionAppId, SubscriptionPlan> = {
  inout: {
    appId: 'inout',
    appName: 'IN & OUT',
    entitlement: 'inout',
    stripePriceEnv: 'STRIPE_PRICE_INOUT_MONTHLY',
    trialDays: Number(process.env.NEXT_PUBLIC_INOUT_TRIAL_DAYS || 0),
  },
  all_apps: {
    appId: 'all_apps',
    appName: 'CJS App Lab All Apps',
    entitlement: 'all_apps',
    stripePriceEnv: 'STRIPE_PRICE_ALL_APPS_MONTHLY',
    trialDays: Number(process.env.NEXT_PUBLIC_ALL_APPS_TRIAL_DAYS || 0),
  },
}

export function getPlan(appId: string = 'inout') {
  return SUBSCRIPTION_PLANS[(appId as SubscriptionAppId)] ?? SUBSCRIPTION_PLANS.inout
}

export function isSubscriptionStatusActive(status?: string | null, currentPeriodEndMs?: number | null) {
  const s = String(status || '').toLowerCase()
  if (['active', 'trialing'].includes(s)) return true
  if (currentPeriodEndMs && currentPeriodEndMs > Date.now()) return true
  return false
}
