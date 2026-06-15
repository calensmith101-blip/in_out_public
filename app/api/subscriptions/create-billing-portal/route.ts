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
    const doc = await getFirestoreDocument(`users/${user.uid}/subscriptions/${plan.appId}`) as any
    const fallback = plan.appId !== 'all_apps' ? await getFirestoreDocument(`users/${user.uid}/subscriptions/all_apps`) as any : null
    const customerId = doc?.customerId || fallback?.customerId
    if (!customerId) throw new Error('No Stripe customer found for this user')

    const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin
    const params = new URLSearchParams()
    params.set('customer', customerId)
    params.set('return_url', `${baseUrl}/dashboard`)

    const session = await stripePost('/v1/billing_portal/sessions', params)
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('create-billing-portal failed', err)
    return NextResponse.json({ error: err.message || 'Billing portal failed' }, { status: 400 })
  }
}
