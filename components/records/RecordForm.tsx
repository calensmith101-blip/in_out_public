'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Search, CheckCircle2 } from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { findJobByNumber } from '@/lib/jobLookup'
import { cn } from '@/lib/utils'
import type { FieldConfig } from '@/types/app'

interface RecordFormProps {
  collection: string
  singular?: string
  fields: FieldConfig[]
  backHref?: string
  id?: string
  defaults?: Record<string, any>
}

function groupFields(fields: FieldConfig[]) {
  const groups: Record<string, FieldConfig[]> = { '': [] }
  for (const f of fields) {
    const g = f.group ?? ''
    if (!groups[g]) groups[g] = []
    groups[g].push(f)
  }
  return groups
}

function hasJobLink(fields: FieldConfig[]) {
  return fields.some(f => ['jobTitle', 'linkedJobNumber', 'jobNumber'].includes(f.name))
}

function numberOrZero(value: any) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function autoTotals(collectionName: string, form: Record<string, any>) {
  const next = { ...form }

  if (collectionName === 'labourEntries') {
    const hours = numberOrZero(next.totalHours)
    const rate = numberOrZero(next.hourlyRate)
    if (hours && rate && !numberOrZero(next.totalCost)) next.totalCost = Number((hours * rate).toFixed(2))
  }

  if (collectionName === 'materials') {
    const cost = numberOrZero(next.cost)
    const markup = numberOrZero(next.markup)
    if (cost && !numberOrZero(next.billableAmount)) next.billableAmount = Number((cost * (1 + markup / 100)).toFixed(2))
  }

  if (collectionName === 'vehicleEntries') {
    const start = numberOrZero(next.odometerStart)
    const end = numberOrZero(next.odometerEnd)
    if (end > start && !numberOrZero(next.kilometres)) next.kilometres = Number((end - start).toFixed(1))
  }

  return next
}

export default function RecordForm({
  collection: collectionName,
  singular = 'Record',
  fields,
  backHref,
  id,
  defaults = {},
}: RecordFormProps) {
  const user = useFirebaseUser()
  const { wsId } = useWorkspace()
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [jobLookup, setJobLookup] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle')

  const initial = useMemo(() => {
    const base: Record<string, any> = {}
    for (const field of fields) base[field.name] = defaults[field.name] ?? field.defaultValue ?? ''
    if ('workspaceId' in base && !base.workspaceId) base.workspaceId = wsId || 'my-business'
    return base
  }, [defaults, fields, wsId])

  useEffect(() => {
    async function load() {
      if (user === undefined) return
      if (!user) { setForm(initial); setLoading(false); return }

      if (!id) {
        setForm(initial)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const snap = await getDoc(doc(db, userCollectionPath(user.uid, collectionName), id))
        setForm(snap.exists() ? { ...initial, ...snap.data() } : initial)
      } catch (err: any) {
        setError(err.message || `Could not load ${singular.toLowerCase()}.`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [collectionName, id, initial, singular, user])

  function updateField(name: string, value: any) {
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'workspaceId') {
        next.linkedJobId = ''
        next.linkedJobNumber = ''
        setJobLookup('idle')
      }
      return next
    })
  }

  async function lookupJob() {
    if (!user) { setError('Sign in before linking a job.'); return }
    const number = String(form.linkedJobNumber || '').trim()
    if (!number) return
    setJobLookup('searching')
    setError('')
    const job = await findJobByNumber(user.uid, form.workspaceId || wsId || 'my-business', number)
    if (!job) {
      setJobLookup('notfound')
      return
    }
    setForm(prev => ({
      ...prev,
      workspaceId: job.workspaceId || prev.workspaceId || wsId || 'my-business',
      linkedJobId: job.id,
      linkedJobNumber: job.jobNumber || number.toUpperCase(),
      jobTitle: job.jobTitle || job.title || prev.jobTitle || '',
      customerName: job.customerName || prev.customerName || '',
      customerPhone: job.customerPhone || prev.customerPhone || '',
      customerEmail: job.customerEmail || prev.customerEmail || '',
      siteAddress: job.siteAddress || job.address || prev.siteAddress || '',
    }))
    setJobLookup('found')
  }

  function renderField(field: FieldConfig) {
    const value = form[field.name] ?? ''

    if (field.type === 'textarea') {
      return <textarea value={value} required={field.required} placeholder={field.placeholder ?? field.label} onChange={e => updateField(field.name, e.target.value)} className="w-full min-h-28 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500" />
    }

    if (field.type === 'select') {
      return <select value={value} required={field.required} onChange={e => updateField(field.name, e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500">
        <option value="">Select {field.label}</option>
        {(field.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    }

    if (field.type === 'checkbox') {
      return <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"><input type="checkbox" checked={Boolean(value)} onChange={e => updateField(field.name, e.target.checked)} /><span>{field.label}</span></label>
    }

    return <input type={field.type ?? 'text'} value={value} required={field.required} placeholder={field.placeholder ?? field.label} onChange={e => updateField(field.name, e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500" />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { setError('You need to be signed in before saving.'); return }
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      const payload = autoTotals(collectionName, {
        ...form,
        workspaceId: form.workspaceId || wsId || 'my-business',
        updatedAt: serverTimestamp(),
      })

      if (id) await updateDoc(doc(db, userCollectionPath(user.uid, collectionName), id), payload)
      else await addDoc(collection(db, userCollectionPath(user.uid, collectionName)), { ...payload, createdAt: serverTimestamp() })

      setSaved(true)
      setTimeout(() => { if (backHref) window.location.href = backHref }, 350)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const groups = groupFields(fields)
  const showJobLink = hasJobLink(fields)

  if (user === undefined || loading) return <div className="p-4 text-sm text-zinc-500">Loading…</div>
  if (!user) return <div className="p-4 text-sm text-red-300">Not signed in.</div>

  return <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
    <div>
      <h1 className="text-2xl font-bold">{id ? `Edit ${singular}` : `New ${singular}`}</h1>
      <p className="text-sm text-slate-400">Saved to Firebase so finance, tax and records stay synced across devices.</p>
    </div>

    {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    {saved && <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">Saved to Firebase.</div>}

    {showJobLink && <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-300">Link to job</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input className={cn('wj-input', jobLookup === 'found' && 'border-green-400/50')} placeholder="Enter job number, e.g. J-1001" value={form.linkedJobNumber || ''} onChange={e => updateField('linkedJobNumber', e.target.value.toUpperCase())} onBlur={lookupJob} />
        <button type="button" onClick={lookupJob} className="wj-btn-ghost"><Search className="h-4 w-4" /> Find</button>
      </div>
      {jobLookup === 'found' && <p className="mt-2 flex items-center gap-2 text-xs text-green-300"><CheckCircle2 className="h-3.5 w-3.5" /> Job linked. Client/site details copied into this record.</p>}
      {jobLookup === 'notfound' && <p className="mt-2 text-xs text-red-300">No job found with that number in this workspace.</p>}
    </section>}

    {Object.entries(groups).map(([group, groupItems]) => <section key={group || 'main'} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {group && <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-blue-400">{group}</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        {groupItems.map(field => <div key={field.name} className={cn(field.type === 'textarea' && 'md:col-span-2')}>
          {field.type !== 'checkbox' && <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</label>}
          {renderField(field)}
        </div>)}
      </div>
    </section>)}

    <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : saved ? 'Saved' : `Save ${singular}`}</button>
  </form>
}
