import { NextRequest, NextResponse } from 'next/server'
import { setFirestoreDocument } from '@/lib/server/firestoreRest'
import { stripeGet, verifyStripeSignature } from '@/lib/server/stripeRest'

export const runtime = 'nodejs'

type StripeSubscription = {
  id: string
  status?: string
  customer?: string
  current_period_end?: number
  cancel_at_period_end?: boolean
  metadata?: Record<string, string>
}

async function saveSubscription(sub: StripeSubscription, fallback?: Record<string, any>) {
  const metadata = { ...(fallback || {}), ...(sub.metadata || {}) }
  const uid = metadata.uid || fallback?.client_reference_id
  const appId = metadata.appId || fallback?.appId || 'inout'
  if (!uid) throw new Error('Stripe subscription missing metadata.uid')

  const currentPeriodEndMs = sub.current_period_end ? sub.current_period_end * 1000 : null
  await setFirestoreDocument(`users/${uid}/subscriptions/${appId}`, {
    appId,
    entitlement: metadata.entitlement || appId,
    status: sub.status || 'unknown',
    customerId: typeof sub.customer === 'string' ? sub.customer : fallback?.customer,
    subscriptionId: sub.id,
    currentPeriodEndMs,
    currentPeriodEnd: currentPeriodEndMs ? new Date(currentPeriodEndMs).toISOString() : '',
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    provider: 'stripe',
  })
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  try {
    verifyStripeSignature(payload, request.headers.get('stripe-signature'))
    const event = JSON.parse(payload)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripeGet(`/v1/subscriptions/${session.subscription}`) as StripeSubscription
        await saveSubscription(sub, {
          uid: session.client_reference_id,
          client_reference_id: session.client_reference_id,
          appId: session.metadata?.appId || 'inout',
          entitlement: session.metadata?.entitlement || 'inout',
          customer: session.customer,
        })
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await saveSubscription(event.data.object as StripeSubscription)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Stripe webhook failed', err)
    return NextResponse.json({ error: err.message || 'Webhook failed' }, { status: 400 })
  }
}
