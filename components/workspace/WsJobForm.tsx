'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, deleteDoc, doc,
  getDoc, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase/client'
import { wsCollectionPath, getWorkspace, type WorkspaceId } from '@/lib/workspaces'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { nextNumber, peekNextNumber } from '@/lib/counters'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['lead','quoted','approved','in_progress','invoiced','paid','complete','cancelled']
const PRIORITY_OPTIONS = ['low','normal','high','urgent']
const PETLET_WORK_TYPES = ['Maintenance','Garden Maintenance','Extra Approved Task','Materials','Other']
const JOB_TYPES = ['Maintenance','Garden / Lawn','Electrical','Plumbing','Painting','Cleaning','Renovation','Other']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="wj-field-label">{label}</label>
      {children}
    </div>
  )
}

export default function WsJobForm({ wsId, id }: { wsId: WorkspaceId; id?: string }) {
  const router = useRouter()
  const user = useFirebaseUser()
  const ws = getWorkspace(wsId)
  const isPetLet = wsId === 'petlet'

  const [jobNumber, setJobNumber] = useState('')
  const [numberPreview, setNumberPreview] = useState('')
  const [numberLoading, setNumberLoading] = useState(!id)
  const [v, setV] = useState<Record<string, any>>({
    jobTitle: '', customerName: '',
    customerPhone: '', customerEmail: '',
    siteAddress: '', jobDescription: '',
    status: 'lead', priority: 'normal',
    jobType: isPetLet ? 'Maintenance' : '',
    startDate: '', dueDate: '',
    petletProperty: '', petletWorkType: 'Maintenance',
    preApproved: false,
  })
  const [docLoading, setDocLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [addToCalendar, setAddToCalendar] = useState(true)

  // Load next number preview or existing job
  useEffect(() => {
    if (user === undefined) return
    if (!user) { setDocLoading(false); setNumberLoading(false); return }

    if (id) {
      // Edit mode: load existing
      setDocLoading(true)
      getDoc(doc(db, wsCollectionPath(user.uid, wsId, 'jobs'), id))
        .then(snap => {
          if (snap.exists()) {
            const data = snap.data()
            setJobNumber(data.jobNumber || '')
            setV(prev => ({ ...prev, ...data }))
            setAddToCalendar(data.addToCalendar !== false)
          }
        })
        .catch(e => setError(e.message))
        .finally(() => setDocLoading(false))
    } else {
      // Create mode: preview next number
      peekNextNumber(user.uid, wsId, 'job')
        .then(n => { setJobNumber(n); setNumberPreview(n) })
        .finally(() => setNumberLoading(false))
    }
  }, [user, id, wsId])

  function set(field: string, value: any) {
    setV(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    if (!user) { setError('Not signed in.'); return }
    setSaving(true); setSaved(false); setError('')
    const uid = user.uid
    try {
      let finalNumber = jobNumber.trim()
      if (!id && (!finalNumber || finalNumber.toLowerCase().includes('generating') || finalNumber === numberPreview)) {
        finalNumber = await nextNumber(uid, wsId, 'job')
        setJobNumber(finalNumber)
      }

      const payload: Record<string, any> = {
        ...v,
        jobNumber: finalNumber,
        workspaceId: wsId,
        updatedAt: serverTimestamp(),
      }

      async function mirrorJobAndCalendar(jobId: string, data: Record<string, any>) {
        const writes: Promise<any>[] = []
        if (wsId === 'my-business') {
          writes.push(setDoc(doc(db, 'users', uid, 'jobs', jobId), data, { merge: true }))
        }
        if (addToCalendar && (data.startDate || data.dueDate)) {
          const date = String(data.startDate || data.dueDate)
          const startTime = date.length === 10 ? `${date}T09:00` : date
          const endTime = date.length === 10 ? `${date}T10:00` : date
          writes.push(setDoc(doc(db, 'users', uid, 'appointments', `job_${jobId}`), {
            title: data.jobTitle || `Job ${data.jobNumber}`,
            customerName: data.customerName || '',
            startTime,
            endTime,
            status: 'BOOKED',
            address: data.siteAddress || '',
            notes: data.jobDescription || '',
            jobId,
            jobNumber: data.jobNumber || '',
            workspaceId: wsId,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          }, { merge: true }))
        }
        await Promise.all(writes)
      }

      if (id) {
        const jobRef = doc(db, wsCollectionPath(uid, wsId, 'jobs'), id)
        await setDoc(jobRef, { ...payload, addToCalendar }, { merge: true })
        await mirrorJobAndCalendar(id, { ...payload, addToCalendar })
        const check = await getDoc(jobRef)
        if (!check.exists()) throw new Error('Job did not save online. Please check your internet/Firebase connection and try again.')
        setSaved(true)
        window.location.href = wsId === 'my-business' ? `/jobs/${id}` : `/${wsId}/jobs/${id}`
      } else {
        const jobRef = doc(collection(db, wsCollectionPath(uid, wsId, 'jobs')))
        const createPayload = { ...payload, addToCalendar, createdAt: serverTimestamp() }
        await setDoc(jobRef, createPayload)
        await mirrorJobAndCalendar(jobRef.id, createPayload)
        const check = await getDoc(jobRef)
        if (!check.exists()) throw new Error('Job did not save online. Please check your internet/Firebase connection and try again.')
        setSaved(true)
        window.location.href = wsId === 'my-business' ? `/jobs/${jobRef.id}` : `/${wsId}/jobs/${jobRef.id}`
      }
    } catch (err: any) {
      console.error('Job save failed', err)
      setError(err.message || 'Could not save this job online. Please check your sign-in, internet connection and Firestore rules.')
      setSaving(false)
    }
  }

  async function remove() {
    if (!user || !id || !confirm('Delete this job and all its data?')) return
    await deleteDoc(doc(db, wsCollectionPath(user.uid, wsId, 'jobs'), id))
    router.push(`/${wsId}/jobs`)
    router.refresh()
  }

  const isLoading = user === undefined || docLoading
  if (isLoading) return <div className="p-6 text-sm text-zinc-500">Loading…</div>
  if (!user) return <div className="p-6 text-sm text-red-300">Not signed in.</div>

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Android-style top app bar */}
      <div className="wj-appbar">
        <button onClick={() => router.back()} className="wj-appbar-btn p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="wj-appbar-title">{id ? 'Edit Job' : 'New Job'}</span>
        {id && (
          <button onClick={remove} className="wj-appbar-btn text-red-300 hover:bg-red-500/20">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="wj-appbar-btn bg-white/15 font-bold"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4 pb-32">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Job Number */}
        <div className="wj-section">
          <p className="wj-section-title">Job Reference</p>
          <Field label="Job Number">
            <div className="flex gap-2">
              <input
                className="wj-field font-mono"
                value={numberLoading ? 'Generating…' : jobNumber}
                onChange={e => setJobNumber(e.target.value)}
                placeholder="Auto-generated"
                disabled={numberLoading}
              />
              <div className={cn(
                'rounded-xl border px-3 py-3 text-xs font-bold',
                ws.borderColor, ws.bgColor, ws.textColor
              )}>
                {ws.label === 'My Business' ? 'MY BIZ' : 'PETLET'}
              </div>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">Auto-generated — you can override it</p>
          </Field>
        </div>

        {/* PetLet extras */}
        {isPetLet && (
          <div className="wj-section border-cyan-400/20 bg-cyan-950/20">
            <p className="wj-section-title text-cyan-400">PetLet Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Property Code *">
                <input className="wj-field" required placeholder="e.g. 36H, 9B, 22H" value={v.petletProperty} onChange={e => set('petletProperty', e.target.value)} />
              </Field>
              <Field label="Work Type">
                <select className="wj-field" value={v.petletWorkType} onChange={e => set('petletWorkType', e.target.value)}>
                  {PETLET_WORK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-3 sm:col-span-2 cursor-pointer">
                <input type="checkbox" checked={!!v.preApproved} onChange={e => set('preApproved', e.target.checked)} className="h-4 w-4 rounded accent-cyan-400" />
                <span className="text-sm text-zinc-200">Pre-approved by PetLet</span>
              </label>
            </div>
          </div>
        )}

        {/* Client Details */}
        <div className="wj-section">
          <p className="wj-section-title">Client Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {!isPetLet && (
              <Field label="Client Name *">
                <input className="wj-field" required placeholder="Full name or company" value={v.customerName} onChange={e => set('customerName', e.target.value)} />
              </Field>
            )}
            <Field label="Phone">
              <input className="wj-field" type="tel" placeholder="04xx xxx xxx" value={v.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className="wj-field" type="email" placeholder="client@email.com" value={v.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
            </Field>
            <Field label="Site Address">
              <input className="wj-field sm:col-span-2" placeholder="Property or site address" value={v.siteAddress} onChange={e => set('siteAddress', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Job Details */}
        <div className="wj-section">
          <p className="wj-section-title">Job Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job Title *">
              <input className="wj-field sm:col-span-2" required placeholder="Brief title for this job" value={v.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
            </Field>
            <Field label="Job Type">
              <select className="wj-field" value={v.jobType} onChange={e => set('jobType', e.target.value)}>
                <option value="">— select —</option>
                {(isPetLet ? PETLET_WORK_TYPES : JOB_TYPES).map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="wj-field" value={v.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className="wj-field" value={v.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input className="wj-field" type="date" value={v.startDate} onChange={e => set('startDate', e.target.value)} />
            </Field>
            <Field label="Due Date">
              <input className="wj-field" type="date" value={v.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200 sm:col-span-2">
              <input type="checkbox" checked={addToCalendar} onChange={e => setAddToCalendar(e.target.checked)} className="h-4 w-4 accent-blue-500" />
              Add this job to Calendar when a start or due date is entered
            </label>
            <Field label="Notes / Description">
              <textarea className="wj-field min-h-[80px] sm:col-span-2" placeholder="Job description, special instructions…" value={v.jobDescription} onChange={e => set('jobDescription', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="wj-action-bar">
        <button onClick={() => router.back()} className="wj-btn-ghost flex-1">Cancel</button>
        <button
          onClick={save}
          disabled={saving}
          className="wj-btn-primary flex-[2]"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : saved ? 'Saved ✓' : id ? 'Save Changes' : 'Create Job'}
        </button>
      </div>
    </div>
  )
}
