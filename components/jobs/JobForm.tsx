'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { getNextSimpleNumber } from '@/lib/safeFirestore'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import type { Job, JobPriority, JobStatus } from '@/types/app'

const STATUS_OPTIONS: Array<{ value: JobStatus; label: string }> = [
  { value: 'lead',        label: 'Lead' },
  { value: 'quoted',      label: 'Quoted' },
  { value: 'approved',    label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'invoiced',    label: 'Invoiced' },
  { value: 'paid',        label: 'Paid' },
  { value: 'complete',    label: 'Complete' },
  { value: 'cancelled',   label: 'Cancelled' },
]

const PRIORITY_OPTIONS: Array<{ value: JobPriority; label: string }> = [
  { value: 'low',    label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const EMPTY: Partial<Job> = {
  jobNumber: '',
  jobTitle: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  siteAddress: '',
  jobDescription: '',
  status: 'lead',
  priority: 'normal',
  startDate: '',
  dueDate: '',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="wj-label">{label}</span>
      {children}
    </label>
  )
}

export default function JobForm({ id }: { id?: string }) {
  const router = useRouter()
  const user = useFirebaseUser()
  const [values, setValues] = useState<Partial<Job>>(EMPTY)
  const [docLoading, setDocLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Load existing job when editing
  useEffect(() => {
    if (!id) return
    if (user === undefined) return
    if (!user) { setDocLoading(false); return }
    setDocLoading(true)
    getDoc(doc(db, userCollectionPath(user.uid, 'jobs'), id))
      .then(snap => { if (snap.exists()) setValues({ ...EMPTY, ...snap.data() }) })
      .catch(err => setError(err.message || 'Could not load job'))
      .finally(() => setDocLoading(false))
  }, [user, id])

  function set(field: keyof Job, value: any) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { setError('Not signed in.'); return }
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload: Record<string, any> = {
        ...values,
        updatedAt: serverTimestamp(),
      }
      if (!id && !payload.jobNumber) payload.jobNumber = await getNextSimpleNumber(user.uid, 'job', 'J')
      if (id) {
        // Edit mode — write to the main jobs folder and mirror to My Business workspace.
        const mainRef = doc(db, userCollectionPath(user.uid, 'jobs'), id)
        await setDoc(mainRef, payload, { merge: true })
        await setDoc(
          doc(db, 'users', user.uid, 'workspaces', 'my-business', 'jobs', id),
          { ...payload, workspaceId: 'my-business' },
          { merge: true }
        )
        const check = await getDoc(mainRef)
        if (!check.exists()) throw new Error('Job did not save online. Please check your internet/Firebase connection and try again.')
        setSaved(true)
        setTimeout(() => { window.location.href = `/jobs/${id}` }, 250)
      } else {
        // Create mode — use one document ID and save it online before showing success.
        const newRef = doc(collection(db, userCollectionPath(user.uid, 'jobs')))
        const createPayload = {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          workspaceId: 'my-business',
        }
        await setDoc(newRef, createPayload)
        await setDoc(doc(db, 'users', user.uid, 'workspaces', 'my-business', 'jobs', newRef.id), createPayload, { merge: true })
        const check = await getDoc(newRef)
        if (!check.exists()) throw new Error('Job did not save online. Please check your internet/Firebase connection and try again.')
        setSaved(true)
        setTimeout(() => { window.location.href = `/jobs/${newRef.id}` }, 250)
      }
    } catch (err: any) {
      console.error('Job save failed', err)
      setError(err.message || 'Could not save job. Check Firebase config and Firestore security rules.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!user || !id) return
    if (!confirm('Delete this job? This cannot be undone.')) return
    try {
      await deleteDoc(doc(db, userCollectionPath(user.uid, 'jobs'), id))
      window.location.href = '/jobs'
    } catch (err: any) {
      setError(err.message || 'Could not delete job')
    }
  }

  if (user === undefined) return <div className="text-zinc-500 text-sm p-4">Loading...</div>
  if (!user) return <div className="text-red-300 text-sm p-4">Not signed in.</div>
  if (docLoading) return <div className="text-zinc-500 text-sm p-4">Loading job...</div>

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{id ? 'Edit Job' : 'New Job'}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {id
            ? 'Update job details — changes save immediately.'
            : 'Create a job first — then add quotes, invoices and materials inside it.'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <strong>Error:</strong> {error}
          <p className="mt-1 text-xs text-red-400/70">
            If this repeats, check Firebase Console → Firestore → Rules and ensure your .env.local has all NEXT_PUBLIC_FIREBASE_* values set.
          </p>
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
          ✓ Saved — navigating…
        </div>
      )}

      {/* Customer info */}
      <div className="wj-card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Customer</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer name *">
            <input
              className="wj-input"
              required
              value={values.customerName ?? ''}
              onChange={e => set('customerName', e.target.value)}
              placeholder="e.g. John Smith"
            />
          </Field>
          <Field label="Phone">
            <input
              className="wj-input"
              type="tel"
              value={values.customerPhone ?? ''}
              onChange={e => set('customerPhone', e.target.value)}
              placeholder="04xx xxx xxx"
            />
          </Field>
          <Field label="Email">
            <input
              className="wj-input"
              type="email"
              value={values.customerEmail ?? ''}
              onChange={e => set('customerEmail', e.target.value)}
              placeholder="customer@email.com"
            />
          </Field>
          <Field label="Site address">
            <input
              className="wj-input"
              value={values.siteAddress ?? ''}
              onChange={e => set('siteAddress', e.target.value)}
              placeholder="123 Main St, Suburb"
            />
          </Field>
        </div>
      </div>

      {/* Job details */}
      <div className="wj-card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Job Details</h2>
        <Field label="Job number">
          <input className="wj-input" value={values.jobNumber ?? ''} onChange={e => set('jobNumber', e.target.value.toUpperCase())} placeholder="auto: J-1001" />
        </Field>
        <Field label="Job title *">
          <input
            className="wj-input"
            required
            value={values.jobTitle ?? ''}
            onChange={e => set('jobTitle', e.target.value)}
            placeholder="e.g. Kitchen renovation, Electrical fitout"
          />
        </Field>
        <Field label="Description">
          <textarea
            className="wj-input min-h-24"
            value={values.jobDescription ?? ''}
            onChange={e => set('jobDescription', e.target.value)}
            placeholder="Describe the work to be done..."
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Status">
            <select
              className="wj-input"
              value={values.status ?? 'lead'}
              onChange={e => set('status', e.target.value as JobStatus)}
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="wj-input"
              value={values.priority ?? 'normal'}
              onChange={e => set('priority', e.target.value as JobPriority)}
            >
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Start date">
            <input
              className="wj-input"
              type="date"
              value={values.startDate ?? ''}
              onChange={e => set('startDate', e.target.value)}
            />
          </Field>
          <Field label="Due date">
            <input
              className="wj-input"
              type="date"
              value={values.dueDate ?? ''}
              onChange={e => set('dueDate', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <button
          className="wj-btn-primary"
          type="submit"
          disabled={saving || saved}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : id ? 'Save Changes' : 'Create Job'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="wj-btn-ghost"
          disabled={saving}
        >
          Cancel
        </button>
        {id && (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="ml-auto rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
          >
            Delete Job
          </button>
        )}
      </div>
    </form>
  )
}
