'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { getNextSimpleNumber, safeCreateUserDoc, safeUpdateUserDoc } from '@/lib/safeFirestore'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import type { CollectionConfig } from '@/types/app'
import { findJobByNumber } from '@/lib/jobLookup'
import FieldInput from './FieldInput'

export default function CrudForm({ config, id }: { config: CollectionConfig, id?: string }) {
  const router = useRouter()
  const user = useFirebaseUser()
  const [values, setValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [jobLookup, setJobLookup] = useState<'idle'|'searching'|'found'|'notfound'>('idle')

  const defaults = useMemo(() => Object.fromEntries(config.fields.map(f => [f.name, f.defaultValue ?? (f.type === 'date' ? new Date().toISOString().slice(0,10) : '')])), [config.fields])
  const supportsJobLink = config.fields.some(f => ['linkedJobNumber', 'jobTitle'].includes(f.name))

  useEffect(() => {
    setValues(defaults)
  }, [defaults])

  useEffect(() => {
    async function load() {
      if (!user || !id) return
      setLoading(true)
      const snap = await getDoc(doc(db, userCollectionPath(user.uid, config.collection), id))
      if (snap.exists()) setValues({ ...defaults, ...snap.data() })
      setLoading(false)
    }
    load()
  }, [user, id, config.collection, defaults])

  async function lookupJob() {
    if (!user || !values.linkedJobNumber) return
    setJobLookup('searching')
    const job = await findJobByNumber(user.uid, values.workspaceId || 'my-business', String(values.linkedJobNumber))
    if (!job) { setJobLookup('notfound'); return }
    setValues(prev => ({
      ...prev,
      workspaceId: job.workspaceId || prev.workspaceId || 'my-business',
      linkedJobId: job.id,
      linkedJobNumber: job.jobNumber || prev.linkedJobNumber,
      jobTitle: job.jobTitle || job.title || prev.jobTitle || '',
      customerName: job.customerName || prev.customerName || '',
      customerPhone: job.customerPhone || prev.customerPhone || '',
      customerEmail: job.customerEmail || prev.customerEmail || '',
      address: job.siteAddress || job.address || prev.address || '',
      siteAddress: job.siteAddress || job.address || prev.siteAddress || '',
    }))
    setJobLookup('found')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { setError('You need to be signed in before saving.'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, any> = { ...values, updatedAt: serverTimestamp() }
      if (!payload.workspaceId && ['expenses','materials','travelLogs'].includes(config.collection)) payload.workspaceId = 'my-business'
      if (config.collection === 'materials' && payload.quantity && payload.unitCost && !payload.totalCost) payload.totalCost = Number(payload.quantity || 0) * Number(payload.unitCost || 0)
      if (!id) {
        if (config.collection === 'jobs' && !payload.jobNumber) payload.jobNumber = await getNextSimpleNumber(user.uid, 'job', 'J')
        if (config.collection === 'quotes' && !payload.quoteNumber) payload.quoteNumber = await getNextSimpleNumber(user.uid, 'quote', 'Q')
        if (config.collection === 'invoices' && !payload.invoiceNumber) payload.invoiceNumber = await getNextSimpleNumber(user.uid, 'invoice', 'INV')
      }
      if (config.collection === 'invoices') {
        const total = Number(payload.total || 0)
        const paid = Number(payload.amountPaid || 0)
        payload.balanceOwing = Math.max(0, total - paid)
        payload.status = paid <= 0 ? (payload.status === 'DRAFT' ? 'DRAFT' : 'SENT') : paid >= total ? 'PAID' : 'PART_PAID'
      }
      if (id) await safeUpdateUserDoc(user.uid, config.collection, id, payload)
      else await safeCreateUserDoc(user.uid, config.collection, payload)
      window.location.href = config.path
    } catch (err: any) {
      console.error('Save failed', err)
      setError(err.message || 'Could not save')
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!user || !id) return
    if (!confirm(`Delete this ${config.singular.toLowerCase()}? This cannot be undone.`)) return
    await deleteDoc(doc(db, userCollectionPath(user.uid, config.collection), id))
    window.location.href = config.path
  }

  if (user === undefined || loading) return <div className="text-wj-muted">Loading...</div>

  return <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
    <div>
      <h1 className="text-2xl font-bold">{id ? `Edit ${config.singular}` : `New ${config.singular}`}</h1>
      <p className="text-wj-muted mt-1">{config.description || `Manage ${config.singular.toLowerCase()} details.`}</p>
    </div>
    {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>}
    {supportsJobLink && <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-300">Link to job</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input className="wj-input" placeholder="Enter job number, e.g. J-1001" value={values.linkedJobNumber || ''} onChange={e => setValues(prev => ({ ...prev, linkedJobNumber: e.target.value.toUpperCase() }))} onBlur={lookupJob} />
        <button type="button" onClick={lookupJob} className="wj-btn-ghost">Find</button>
      </div>
      {jobLookup === 'found' && <p className="mt-2 text-xs text-green-300">Job linked. Client/site details copied.</p>}
      {jobLookup === 'notfound' && <p className="mt-2 text-xs text-red-300">No job found with that number.</p>}
    </div>}
    <div className="wj-card p-5 grid gap-4 md:grid-cols-2">
      {config.fields.map(field => <label key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
        <span className="wj-label">{field.label}</span>
        <FieldInput field={field} value={values[field.name]} onChange={v => setValues(prev => ({ ...prev, [field.name]: v }))} />
      </label>)}
    </div>
    <div className="flex gap-3">
      <button className="wj-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      <button type="button" onClick={() => router.back()} className="wj-btn-ghost">Cancel</button>
      {id && <button type="button" onClick={remove} className="ml-auto rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">Delete</button>}
    </div>
  </form>
}
