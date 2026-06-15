import crypto from 'crypto'

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
  return key
}

export async function stripePost(path: string, params: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stripeKey()}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || `Stripe POST ${path} failed`)
  return json
}

export async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { authorization: `Bearer ${stripeKey()}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || `Stripe GET ${path} failed`)
  return json
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  if (!signatureHeader) throw new Error('Missing Stripe signature')

  const entries = Object.fromEntries(signatureHeader.split(',').map(part => {
    const [key, ...rest] = part.split('=')
    return [key, rest.join('=')]
  }))
  const timestamp = entries.t
  const expected = entries.v1
  if (!timestamp || !expected) throw new Error('Invalid Stripe signature header')

  const signedPayload = `${timestamp}.${payload}`
  const digest = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  const a = Buffer.from(digest)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid Stripe signature')
}
