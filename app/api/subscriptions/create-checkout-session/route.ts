import { NextRequest, NextResponse } from 'next/server'
import { getPlan } from '@/lib/subscriptionConfig'
import { verifyFirebaseIdToken } from '@/lib/server/firebaseAuthRest'
import { getFirestoreDocument } from '@/lib/server/firestoreRest'
import { stripePost } from '@/lib/server/stripeRest'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { idToken, appId = 'inout' } = await request.json()
    const user = await verifyFirebaseIdToken(idToken)
    const plan = getPlan(appId)
    const priceId = process.env[plan.stripePriceEnv]
    if (!priceId) throw new Error(`Missing ${plan.stripePriceEnv}`)

    const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin
    const existing = await getFirestoreDocument(`users/${user.uid}/subscriptions/${plan.appId}`).catch(() => null) as any

    const params = new URLSearchParams()
    params.set('mode', 'subscription')
    params.set('success_url', `${baseUrl}/dashboard?checkout=success`)
    params.set('cancel_url', `${baseUrl}/dashboard?checkout=cancelled`)
    params.set('client_reference_id', user.uid)
    params.set('line_items[0][price]', priceId)
    params.set('line_items[0][quantity]', '1')
    params.set('allow_promotion_codes', 'true')
    if (existing?.customerId) params.set('customer', existing.customerId)
    else if (user.email) params.set('customer_email', user.email)
    params.set('metadata[uid]', user.uid)
    params.set('metadata[email]', user.email)
    params.set('metadata[appId]', plan.appId)
    params.set('metadata[entitlement]', plan.entitlement)
    params.set('subscription_data[metadata][uid]', user.uid)
    params.set('subscription_data[metadata][email]', user.email)
    params.set('subscription_data[metadata][appId]', plan.appId)
    params.set('subscription_data[metadata][entitlement]', plan.entitlement)
    if (plan.trialDays && plan.trialDays > 0) params.set('subscription_data[trial_period_days]', String(plan.trialDays))

    const session = await stripePost('/v1/checkout/sessions', params)
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('create-checkout-session failed', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 400 })
  }
}
