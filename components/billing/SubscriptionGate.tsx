'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { doc, onSnapshot } from 'firebase/firestore'
import { CreditCard, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { db } from '@/lib/firebase/client'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { isSubscriptionStatusActive, SUBSCRIPTIONS_REQUIRED } from '@/lib/subscriptionConfig'

type SubscriptionDoc = {
  status?: string
  customerId?: string
  subscriptionId?: string
  currentPeriodEnd?: string
  currentPeriodEndMs?: number
  appId?: string
  entitlement?: string
}

function useSubDoc(uid: string | undefined, id: 'inout' | 'all_apps') {
  const [data, setData] = useState<SubscriptionDoc | null>(null)
  const [loading, setLoading] = useState(Boolean(uid))

  useEffect(() => {
    if (!uid) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, 'users', uid, 'subscriptions', id)
    return onSnapshot(ref, snap => {
      setData(snap.exists() ? (snap.data() as SubscriptionDoc) : null)
      setLoading(false)
    }, () => {
      setData(null)
      setLoading(false)
    })
  }, [uid, id])

  return { data, loading }
}

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const user = useFirebaseUser()
  const inout = useSubDoc(user?.uid, 'inout')
  const bundle = useSubDoc(user?.uid, 'all_apps')
  const [busy, setBusy] = useState<'inout' | 'all_apps' | 'portal' | null>(null)
  const [error, setError] = useState('')

  const allowed = useMemo(() => {
    if (!SUBSCRIPTIONS_REQUIRED) return true
    return isSubscriptionStatusActive(inout.data?.status, inout.data?.currentPeriodEndMs)
      || isSubscriptionStatusActive(bundle.data?.status, bundle.data?.currentPeriodEndMs)
  }, [inout.data, bundle.data])

  if (!SUBSCRIPTIONS_REQUIRED) return <>{children}</>

  if (user === undefined || inout.loading || bundle.loading) {
    return <div className="min-h-screen grid place-items-center text-wj-muted">Checking subscription…</div>
  }

  if (allowed) return <>{children}</>

  async function startCheckout(appId: 'inout' | 'all_apps') {
    if (!user) return
    setBusy(appId)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId, idToken }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Checkout failed')
      window.location.href = json.url
    } catch (err: any) {
      setError(err.message || 'Checkout failed')
      setBusy(null)
    }
  }

  async function manageBilling() {
    if (!user) return
    setBusy('portal')
    setError('')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/subscriptions/create-billing-portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken, appId: inout.data?.customerId ? 'inout' : 'all_apps' }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Billing portal failed')
      window.location.href = json.url
    } catch (err: any) {
      setError(err.message || 'Billing portal failed')
      setBusy(null)
    }
  }

  const hasCustomer = Boolean(inout.data?.customerId || bundle.data?.customerId)

  return (
    <main className="min-h-screen bg-wj-bg p-5 text-wj-text">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center">
        <section className="wj-panel w-full overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-200">
                <LockKeyhole className="h-3.5 w-3.5" /> Subscription required
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Unlock IN & OUT</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                Your account data is private to your Firebase login. Subscribe to use the live invoicing, quote, job, finance and tax screens.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><ShieldCheck className="mb-2 h-5 w-5 text-green-300" /><p className="text-sm font-bold">Private user data</p><p className="mt-1 text-xs text-zinc-500">Each user is scoped to their own UID folder.</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><CreditCard className="mb-2 h-5 w-5 text-blue-300" /><p className="text-sm font-bold">Stripe checkout</p><p className="mt-1 text-xs text-zinc-500">Card details stay with Stripe.</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><Sparkles className="mb-2 h-5 w-5 text-amber-300" /><p className="text-sm font-bold">Demo available</p><p className="mt-1 text-xs text-zinc-500">Try sample data without touching Firestore.</p></div>
              </div>
            </div>
            <div className="space-y-3">
              {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
              <button onClick={() => startCheckout('inout')} disabled={!!busy} className="wj-btn-primary w-full justify-center py-4 text-base">
                {busy === 'inout' ? 'Opening checkout…' : 'Subscribe to IN & OUT'}
              </button>
              <button onClick={() => startCheckout('all_apps')} disabled={!!busy} className="wj-btn-ghost w-full justify-center py-4 text-base">
                {busy === 'all_apps' ? 'Opening checkout…' : 'Subscribe to all apps bundle'}
              </button>
              {hasCustomer && <button onClick={manageBilling} disabled={!!busy} className="wj-btn-ghost w-full justify-center">{busy === 'portal' ? 'Opening billing…' : 'Manage billing'}</button>}
              <Link href="/demo" className="block rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm font-bold text-zinc-300 hover:bg-white/10">Open demo mode</Link>
              <p className="text-center text-xs text-zinc-500">Set NEXT_PUBLIC_REQUIRE_SUBSCRIPTIONS=false while testing.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
