'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser } from '@/lib/firebase/hooks'

const SETTINGS_LOCAL_KEY = 'tradieday_business_settings_v1'

function readLocalSettings() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(window.localStorage.getItem(SETTINGS_LOCAL_KEY) || 'null') } catch { return null }
}

function writeLocalSettings(values: any) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(values))
}

function timeout<T>(promise: Promise<T>, ms = 3500) {
  return Promise.race([promise, new Promise(resolve => window.setTimeout(() => resolve('timeout'), ms))])
}

const defaults = {
  businessName: 'That Property Maintenance Guy',
  accountName: 'Calen Smith',
  phone: '0415 552 741',
  email: 'gmrbycandy@gmail.com',
  abn: '16 548 663 376',
  address: '',
  bsb: '',
  accountNumber: '',
  hourlyRate: 70,
  taxSetAsidePercent: 25,
  gstRegistered: false,
  atoKmRate: 0.88,
  defaultPaymentTerms: 'Payment is due within 7 days of invoice date. Please pay via bank transfer.',
}

export default function SettingsPage() {
  const user = useFirebaseUser()
  const [values, setValues] = useState<any>(defaults)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const local = readLocalSettings()
      if (local) setValues((v: any) => ({ ...v, ...local }))
      if (!user) return
      try {
        const snap = await getDoc(doc(db, userCollectionPath(user.uid, 'settings'), 'business'))
        if (snap.exists()) setValues((v: any) => ({ ...v, ...snap.data() }))
      } catch (err) {
        console.error('Settings load failed', err)
      }
    }
    load()
  }, [user])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(''); setError('')
    try {
      writeLocalSettings(values)
      setSaved('Settings saved locally. New invoices will use these details.')
      setSaving(false)
      if (user) {
        ;(async () => {
          try {
            const result = await timeout(setDoc(doc(db, userCollectionPath(user.uid, 'settings'), 'business'), { ...values, updatedAt: serverTimestamp() }, { merge: true }), 2500)
            setSaved(result === 'timeout' ? 'Settings saved locally. Firebase timed out, but local settings are ready.' : 'Settings saved locally and to Firebase.')
          } catch (cloudErr: any) {
            console.error('Settings Firebase save failed, local copy kept', cloudErr)
            setSaved('Settings saved locally. Firebase failed, but local settings are ready.')
          }
        })()
      }
    } catch (err: any) {
      console.error('Settings save failed', err)
      setError(err.message || 'Could not save settings.')
      setSaving(false)
    }
  }

  const field = (name: string, label: string, type = 'text', placeholder = '') => (
    <label>
      <span className="wj-label">{label}</span>
      <input className="wj-input" type={type} placeholder={placeholder} value={values[name] ?? ''} onChange={e => setValues((v:any)=>({...v,[name]: type==='number' ? Number(e.target.value) : e.target.value}))} />
    </label>
  )

  return <form onSubmit={save} className="mx-auto max-w-4xl space-y-5">
    <div>
      <h1 className="text-3xl font-black">Settings</h1>
      <p className="text-wj-muted">Business details, bank details, rates and tax defaults.</p>
    </div>

    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    {saved && <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{saved}</div>}

    <section className="wj-card p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-400">Business Details</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {field('businessName','Business name')}
        {field('abn','ABN')}
        {field('phone','Phone')}
        {field('email','Email','email')}
        <label className="md:col-span-2"><span className="wj-label">Business address</span><input className="wj-input" value={values.address ?? ''} onChange={e=>setValues((v:any)=>({...v,address:e.target.value}))} /></label>
      </div>
    </section>

    <section className="wj-card p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-400">Bank Details for Invoices</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {field('accountName','Account name')}
        {field('bsb','BSB','text','062-000')}
        {field('accountNumber','Account number','text','1234 5678')}
      </div>
    </section>

    <section className="wj-card p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-400">Rates & Tax</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {field('hourlyRate','Default hourly rate','number')}
        {field('taxSetAsidePercent','Tax set-aside %','number')}
        {field('atoKmRate','ATO KM rate','number')}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!values.gstRegistered} onChange={e=>setValues((v:any)=>({...v,gstRegistered:e.target.checked}))}/> GST registered</label>
      </div>
      <label className="mt-4 block"><span className="wj-label">Default payment terms</span><textarea className="wj-input min-h-28" value={values.defaultPaymentTerms ?? ''} onChange={e=>setValues((v:any)=>({...v,defaultPaymentTerms:e.target.value}))} /></label>
    </section>

    <button disabled={saving} className="wj-btn-primary disabled:opacity-50">{saving ? 'Saving…' : 'Save settings'}</button>
  </form>
}
