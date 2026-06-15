'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  addDoc, collection, deleteDoc, doc, getDocs,
  serverTimestamp, updateDoc,
} from 'firebase/firestore'
import {
  ArrowLeft, Banknote, Calendar, CheckSquare,
  ClipboardList, Clock, Download, Edit2, Edit,
  FileText, MessageSquare, Package,
  Plus, Receipt, Save, Trash2, X,
} from 'lucide-react'
import { db, jobSubPath, userCollectionPath } from '@/lib/firebase/client'
import { useJob, useJobSubCollection } from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
import { cn, jobStatusLabel, priorityColor, statusColor } from '@/lib/utils'
import type { JobSubTab, JobStatus } from '@/types/app'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function pretty(v: any) {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('wj-badge capitalize', statusColor[status] ?? 'bg-white/5 text-zinc-400 border-white/10')}>
      {jobStatusLabel[status] ?? status}
    </span>
  )
}

// ── Financial summary ──────────────────────────────────────────────────────────

function FinancialSummary({ job }: { job: any }) {
  const items = [
    { label: 'Quoted',    value: job.totalQuoted,    cls: 'text-blue-300'   },
    { label: 'Invoiced',  value: job.totalInvoiced,  cls: 'text-orange-300' },
    { label: 'Paid',      value: job.totalPaid,      cls: 'text-green-300'  },
    { label: 'Materials', value: job.totalMaterials, cls: 'text-amber-300'  },
    { label: 'Labour',    value: job.totalLabour,    cls: 'text-purple-300' },
    { label: 'Balance Due', value: job.balanceDue,  cls: 'text-red-300'    },
  ]
  return (
    <div className="wj-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Financial Summary</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map(item => (
          <div key={item.label} className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-zinc-500">{item.label}</p>
            <p className={cn('mt-1 text-sm font-bold', item.cls)}>
              {item.value != null ? formatCurrency(item.value) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Recalc job totals (reads fresh from Firestore, no stale closure) ──────────

async function recalcJobTotals(uid: string, jobId: string) {
  const base = `users/${uid}/jobs/${jobId}`
  const [qSnap, iSnap, mSnap, pSnap, lSnap] = await Promise.all([
    getDocs(collection(db, `${base}/quotes`)),
    getDocs(collection(db, `${base}/invoices`)),
    getDocs(collection(db, `${base}/materials`)),
    getDocs(collection(db, `${base}/payments`)),
    getDocs(collection(db, `${base}/labour`)),
  ])
  const totalQuoted    = qSnap.docs.map(d => d.data()).filter(q => q.status === 'ACCEPTED').reduce((a, q) => a + Number(q.total || 0), 0)
  const totalInvoiced  = iSnap.docs.map(d => d.data()).reduce((a, i) => a + Number(i.total || 0), 0)
  const totalPaid      = pSnap.docs.map(d => d.data()).reduce((a, p) => a + Number(p.amount || 0), 0)
  const totalMaterials = mSnap.docs.map(d => d.data()).reduce((a, m) => a + Number(m.totalCost || 0), 0)
  const totalLabour    = lSnap.docs.map(d => d.data()).reduce((a, l) => a + Number(l.totalCost || 0), 0)
  const balanceDue     = Math.max(0, totalInvoiced - totalPaid)
  await updateDoc(doc(db, `users/${uid}/jobs`, jobId), {
    totalQuoted, totalInvoiced, totalPaid, totalMaterials, totalLabour, balanceDue, updatedAt: serverTimestamp(),
  })
}

// ── Inline edit wrapper ────────────────────────────────────────────────────────
// Each sub-item can flip to an edit form inline, matching Android's "tap to edit" UX.

interface EditableItemProps {
  item: any
  onSave: (id: string, data: any) => Promise<void>
  onDelete: (id: string) => void
  viewContent: React.ReactNode
  editContent: (vals: any, setVals: (v: any) => void) => React.ReactNode
  defaultVals: (item: any) => any
}

function EditableItem({ item, onSave, onDelete, viewContent, editContent, defaultVals }: EditableItemProps) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState<any>({})
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setVals(defaultVals(item))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    await onSave(item.id, vals)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="wj-card border-amber-400/30 p-4 space-y-3">
        {editContent(vals, setVals)}
        <div className="flex gap-2">
          <button className="wj-btn-primary" onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="wj-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wj-card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{viewContent}</div>
        <div className="flex shrink-0 gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={startEdit}
            className="wj-btn-ghost p-2 text-zinc-400 hover:text-amber-300"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="wj-btn-ghost p-2 text-zinc-500 hover:text-red-300"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-list shell ─────────────────────────────────────────────────────────────

function SubList({ items, loading, children, addForm, emptyText }: {
  items: any[], loading: boolean, children: React.ReactNode,
  addForm: React.ReactNode, emptyText: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">{addForm}</div>
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="wj-card p-6 text-center">
          <p className="text-sm text-zinc-500">{emptyText}</p>
        </div>
      )}
      {children}
    </div>
  )
}

// ── Add-form toggle wrapper ────────────────────────────────────────────────────

function AddForm({ label, icon: Icon, children }: {
  label: string, icon: any, children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="wj-btn-primary">
        <Plus className="h-4 w-4" /> {label}
      </button>
    )
  }
  return (
    <div className="wj-card w-full border-amber-400/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-bold">{label}</h3>
        <button onClick={() => setOpen(false)} className="ml-auto text-zinc-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children(() => setOpen(false))}
    </div>
  )
}

// ── Label / input helpers ─────────────────────────────────────────────────────

function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="wj-label">{label}</span>
      {children}
    </label>
  )
}

// ── Overview tab ───────────────────────────────────────────────────────────────

function OverviewTab({ job, uid }: { job: any; uid: string }) {
  const [saving, setSaving] = useState(false)
  const STATUS_OPTIONS: JobStatus[] = ['lead','quoted','approved','in_progress','invoiced','paid','complete','cancelled']

  async function changeStatus(status: string) {
    setSaving(true)
    await updateDoc(doc(db, userCollectionPath(uid, 'jobs'), job.id), { status, updatedAt: serverTimestamp() })
    setSaving(false)
  }

  const details = [
    ['Customer',     job.customerName],
    ['Phone',        job.customerPhone],
    ['Email',        job.customerEmail],
    ['Site address', job.siteAddress],
    ['Start date',   job.startDate],
    ['Due date',     job.dueDate],
    ['Description',  job.jobDescription],
  ].filter(([, v]) => v)

  return (
    <div className="space-y-4">
      {/* Status change */}
      <div className="wj-card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Job Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              disabled={saving || job.status === s}
              onClick={() => changeStatus(s)}
              className={cn(
                'rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition',
                job.status === s
                  ? cn(statusColor[s], 'ring-1 ring-white/20')
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20'
              )}
            >
              {jobStatusLabel[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Customer & job info */}
      {details.length > 0 && (
        <div className="wj-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {details.map(([label, value]) => (
                <tr key={label} className="border-t border-white/[0.06] first:border-0">
                  <td className="w-36 py-3 pl-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</td>
                  <td className="py-3 pr-4 text-zinc-200">{pretty(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Quotes tab ─────────────────────────────────────────────────────────────────

function QuotesTab({ jobId, uid }: { jobId: string; uid: string }) {
  const { data: items, loading } = useJobSubCollection<any>(jobId, 'quotes', 'createdAt')
  const EMPTY = { quoteNumber: '', status: 'DRAFT', total: '', description: '', notes: '' }
  const [addVals, setAddVals] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addVals.total) return
    setAddSaving(true)
    await addDoc(collection(db, jobSubPath(uid, jobId, 'quotes')), {
      ...addVals, total: Number(addVals.total || 0), jobId,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
    setAddVals(EMPTY)
    setAddSaving(false)
    close()
  }

  async function save(id: string, vals: any) {
    await updateDoc(doc(db, jobSubPath(uid, jobId, 'quotes'), id), {
      ...vals, total: Number(vals.total || 0), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  async function remove(id: string) {
    if (!confirm('Delete this quote?')) return
    await deleteDoc(doc(db, jobSubPath(uid, jobId, 'quotes'), id))
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  return (
    <SubList items={items} loading={loading} emptyText="No quotes yet. Add a quote to this job."
      addForm={
        <AddForm label="Add Quote" icon={FileText}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FL label="Quote #"><input className="wj-input" placeholder="Q-0001" value={addVals.quoteNumber} onChange={e => setAddVals(p => ({...p, quoteNumber: e.target.value}))} /></FL>
                <FL label="Status">
                  <select className="wj-input" value={addVals.status} onChange={e => setAddVals(p => ({...p, status: e.target.value}))}>
                    {['DRAFT','SENT','ACCEPTED','DECLINED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FL>
                <FL label="Total ($) *"><input className="wj-input" type="number" value={addVals.total} onChange={e => setAddVals(p => ({...p, total: e.target.value}))} /></FL>
                <FL label="Description"><input className="wj-input" value={addVals.description} onChange={e => setAddVals(p => ({...p, description: e.target.value}))} /></FL>
                <FL label="Notes"><textarea className="wj-input min-h-14 sm:col-span-2" value={addVals.notes} onChange={e => setAddVals(p => ({...p, notes: e.target.value}))} /></FL>
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addVals.total} onClick={() => create(close)}>
                  {addSaving ? 'Saving…' : 'Save Quote'}
                </button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddForm>
      }
    >
      {items.map(item => (
        <EditableItem key={item.id} item={item} onSave={save} onDelete={remove}
          defaultVals={i => ({ quoteNumber: i.quoteNumber || '', status: i.status || 'DRAFT', total: String(i.total || ''), description: i.description || '', notes: i.notes || '' })}
          viewContent={
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{item.quoteNumber || 'Quote'}</span>
                <span className={cn('wj-badge', statusColor[item.status] ?? '')}>{item.status}</span>
                <span className="ml-auto text-sm font-bold text-amber-300">{formatCurrency(item.total)}</span>
              </div>
              {item.description && <p className="mt-1 text-sm text-zinc-400">{item.description}</p>}
              {item.notes && <p className="mt-1 text-xs text-zinc-500">{item.notes}</p>}
            </div>
          }
          editContent={(vals, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <FL label="Quote #"><input className="wj-input" value={vals.quoteNumber} onChange={e => set({...vals, quoteNumber: e.target.value})} /></FL>
              <FL label="Status">
                <select className="wj-input" value={vals.status} onChange={e => set({...vals, status: e.target.value})}>
                  {['DRAFT','SENT','ACCEPTED','DECLINED'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FL>
              <FL label="Total ($)"><input className="wj-input" type="number" value={vals.total} onChange={e => set({...vals, total: e.target.value})} /></FL>
              <FL label="Description"><input className="wj-input" value={vals.description} onChange={e => set({...vals, description: e.target.value})} /></FL>
              <FL label="Notes"><textarea className="wj-input min-h-14 sm:col-span-2" value={vals.notes} onChange={e => set({...vals, notes: e.target.value})} /></FL>
            </div>
          )}
        />
      ))}
    </SubList>
  )
}

// ── Invoices tab ───────────────────────────────────────────────────────────────

function InvoicesTab({ jobId, uid }: { jobId: string; uid: string }) {
  const { data: items, loading } = useJobSubCollection<any>(jobId, 'invoices', 'createdAt')
  const today = new Date().toISOString().slice(0, 10)
  const EMPTY = { invoiceNumber: '', invoiceDate: today, status: 'DRAFT', total: '', amountPaid: '0', notes: '' }
  const [addVals, setAddVals] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addVals.total) return
    setAddSaving(true)
    const total = Number(addVals.total || 0)
    const amountPaid = Number(addVals.amountPaid || 0)
    const balanceOwing = Math.max(0, total - amountPaid)
    let status = addVals.status
    if (amountPaid >= total && total > 0) status = 'PAID'
    else if (amountPaid > 0) status = 'PART_PAID'
    await addDoc(collection(db, jobSubPath(uid, jobId, 'invoices')), {
      ...addVals, total, amountPaid, balanceOwing, status, jobId,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
    setAddVals(EMPTY)
    setAddSaving(false)
    close()
  }

  async function save(id: string, vals: any) {
    const total = Number(vals.total || 0)
    const amountPaid = Number(vals.amountPaid || 0)
    const balanceOwing = Math.max(0, total - amountPaid)
    let status = vals.status
    if (amountPaid >= total && total > 0) status = 'PAID'
    else if (amountPaid > 0) status = 'PART_PAID'
    await updateDoc(doc(db, jobSubPath(uid, jobId, 'invoices'), id), {
      ...vals, total, amountPaid, balanceOwing, status, updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  async function remove(id: string) {
    if (!confirm('Delete this invoice?')) return
    await deleteDoc(doc(db, jobSubPath(uid, jobId, 'invoices'), id))
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  return (
    <SubList items={items} loading={loading} emptyText="No invoices yet. Add an invoice to this job."
      addForm={
        <AddForm label="Add Invoice" icon={Receipt}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FL label="Invoice #"><input className="wj-input" placeholder="INV-0001" value={addVals.invoiceNumber} onChange={e => setAddVals(p => ({...p, invoiceNumber: e.target.value}))} /></FL>
                <FL label="Date"><input className="wj-input" type="date" value={addVals.invoiceDate} onChange={e => setAddVals(p => ({...p, invoiceDate: e.target.value}))} /></FL>
                <FL label="Total ($) *"><input className="wj-input" type="number" value={addVals.total} onChange={e => setAddVals(p => ({...p, total: e.target.value}))} /></FL>
                <FL label="Amount paid ($)"><input className="wj-input" type="number" value={addVals.amountPaid} onChange={e => setAddVals(p => ({...p, amountPaid: e.target.value}))} /></FL>
                <FL label="Status">
                  <select className="wj-input" value={addVals.status} onChange={e => setAddVals(p => ({...p, status: e.target.value}))}>
                    {['DRAFT','SENT','PART_PAID','PAID','VOID'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FL>
                <FL label="Notes"><textarea className="wj-input min-h-14" value={addVals.notes} onChange={e => setAddVals(p => ({...p, notes: e.target.value}))} /></FL>
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addVals.total} onClick={() => create(close)}>
                  {addSaving ? 'Saving…' : 'Save Invoice'}
                </button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddForm>
      }
    >
      {items.map(item => (
        <EditableItem key={item.id} item={item} onSave={save} onDelete={remove}
          defaultVals={i => ({ invoiceNumber: i.invoiceNumber || '', invoiceDate: i.invoiceDate || today, status: i.status || 'DRAFT', total: String(i.total || ''), amountPaid: String(i.amountPaid || '0'), notes: i.notes || '' })}
          viewContent={
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{item.invoiceNumber || 'Invoice'}</span>
                <span className={cn('wj-badge', statusColor[item.status] ?? '')}>{item.status}</span>
                {item.invoiceDate && <span className="text-xs text-zinc-500">{item.invoiceDate}</span>}
                <span className="ml-auto text-sm font-bold text-white">{formatCurrency(item.total)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="text-zinc-400">Paid: <strong className="text-green-300">{formatCurrency(item.amountPaid)}</strong></span>
                {item.balanceOwing > 0 && <span className="text-zinc-400">Owing: <strong className="text-red-300">{formatCurrency(item.balanceOwing)}</strong></span>}
              </div>
              {item.notes && <p className="mt-1 text-xs text-zinc-500">{item.notes}</p>}
            </div>
          }
          editContent={(vals, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <FL label="Invoice #"><input className="wj-input" value={vals.invoiceNumber} onChange={e => set({...vals, invoiceNumber: e.target.value})} /></FL>
              <FL label="Date"><input className="wj-input" type="date" value={vals.invoiceDate} onChange={e => set({...vals, invoiceDate: e.target.value})} /></FL>
              <FL label="Total ($)"><input className="wj-input" type="number" value={vals.total} onChange={e => set({...vals, total: e.target.value})} /></FL>
              <FL label="Amount paid ($)"><input className="wj-input" type="number" value={vals.amountPaid} onChange={e => set({...vals, amountPaid: e.target.value})} /></FL>
              <FL label="Status">
                <select className="wj-input" value={vals.status} onChange={e => set({...vals, status: e.target.value})}>
                  {['DRAFT','SENT','PART_PAID','PAID','VOID'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FL>
              <FL label="Notes"><textarea className="wj-input min-h-14" value={vals.notes} onChange={e => set({...vals, notes: e.target.value})} /></FL>
            </div>
          )}
        />
      ))}
    </SubList>
  )
}

// ── Materials tab ──────────────────────────────────────────────────────────────

function MaterialsTab({ jobId, uid }: { jobId: string; uid: string }) {
  const { data: items, loading } = useJobSubCollection<any>(jobId, 'materials', 'createdAt')
  const EMPTY = { name: '', supplier: '', quantity: '1', unitCost: '', totalCost: '', notes: '' }
  const [addVals, setAddVals] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  function calcTotal(qty: string, unit: string) {
    return String(Number(qty || 1) * Number(unit || 0))
  }

  async function create(close: () => void) {
    if (!addVals.name) return
    setAddSaving(true)
    await addDoc(collection(db, jobSubPath(uid, jobId, 'materials')), {
      ...addVals, quantity: Number(addVals.quantity || 1), unitCost: Number(addVals.unitCost || 0),
      totalCost: Number(addVals.totalCost || 0), jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
    setAddVals(EMPTY)
    setAddSaving(false)
    close()
  }

  async function save(id: string, vals: any) {
    await updateDoc(doc(db, jobSubPath(uid, jobId, 'materials'), id), {
      ...vals, quantity: Number(vals.quantity || 1), unitCost: Number(vals.unitCost || 0),
      totalCost: Number(vals.totalCost || 0), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  async function remove(id: string) {
    if (!confirm('Delete this material?')) return
    await deleteDoc(doc(db, jobSubPath(uid, jobId, 'materials'), id))
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  const totalCost = items.reduce((a, m) => a + Number(m.totalCost || 0), 0)

  return (
    <SubList items={items} loading={loading} emptyText="No materials yet. Add materials used on this job."
      addForm={
        <AddForm label="Add Material" icon={Package}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FL label="Item / description *"><input className="wj-input sm:col-span-2" placeholder="e.g. PVC conduit 20mm, 5m" value={addVals.name} onChange={e => setAddVals(p => ({...p, name: e.target.value}))} /></FL>
                <FL label="Supplier"><input className="wj-input" placeholder="Bunnings" value={addVals.supplier} onChange={e => setAddVals(p => ({...p, supplier: e.target.value}))} /></FL>
                <FL label="Qty"><input className="wj-input" type="number" value={addVals.quantity} onChange={e => setAddVals(p => ({...p, quantity: e.target.value, totalCost: calcTotal(e.target.value, p.unitCost)}))} /></FL>
                <FL label="Unit cost ($)"><input className="wj-input" type="number" value={addVals.unitCost} onChange={e => setAddVals(p => ({...p, unitCost: e.target.value, totalCost: calcTotal(p.quantity, e.target.value)}))} /></FL>
                <FL label="Total cost ($)"><input className="wj-input" type="number" value={addVals.totalCost} onChange={e => setAddVals(p => ({...p, totalCost: e.target.value}))} /></FL>
                <FL label="Notes"><input className="wj-input sm:col-span-2" value={addVals.notes} onChange={e => setAddVals(p => ({...p, notes: e.target.value}))} /></FL>
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addVals.name} onClick={() => create(close)}>
                  {addSaving ? 'Saving…' : 'Save Material'}
                </button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddForm>
      }
    >
      {items.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-amber-400/5 px-4 py-2 text-sm">
          <span className="text-zinc-400">Total materials cost: </span>
          <span className="font-bold text-amber-300">{formatCurrency(totalCost)}</span>
        </div>
      )}
      {items.map(item => (
        <EditableItem key={item.id} item={item} onSave={save} onDelete={remove}
          defaultVals={i => ({ name: i.name || '', supplier: i.supplier || '', quantity: String(i.quantity || 1), unitCost: String(i.unitCost || ''), totalCost: String(i.totalCost || ''), notes: i.notes || '' })}
          viewContent={
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{item.name}</span>
                {item.supplier && <span className="text-xs text-zinc-500">{item.supplier}</span>}
                {item.totalCost > 0 && <span className="ml-auto text-sm font-bold text-amber-300">{formatCurrency(item.totalCost)}</span>}
              </div>
              <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                {item.quantity && <span>Qty: {item.quantity}</span>}
                {item.unitCost > 0 && <span>Unit: {formatCurrency(item.unitCost)}</span>}
              </div>
              {item.notes && <p className="mt-1 text-xs text-zinc-500">{item.notes}</p>}
            </div>
          }
          editContent={(vals, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <FL label="Item *"><input className="wj-input sm:col-span-2" value={vals.name} onChange={e => set({...vals, name: e.target.value})} /></FL>
              <FL label="Supplier"><input className="wj-input" value={vals.supplier} onChange={e => set({...vals, supplier: e.target.value})} /></FL>
              <FL label="Qty"><input className="wj-input" type="number" value={vals.quantity} onChange={e => set({...vals, quantity: e.target.value, totalCost: calcTotal(e.target.value, vals.unitCost)})} /></FL>
              <FL label="Unit ($)"><input className="wj-input" type="number" value={vals.unitCost} onChange={e => set({...vals, unitCost: e.target.value, totalCost: calcTotal(vals.quantity, e.target.value)})} /></FL>
              <FL label="Total ($)"><input className="wj-input" type="number" value={vals.totalCost} onChange={e => set({...vals, totalCost: e.target.value})} /></FL>
              <FL label="Notes"><input className="wj-input sm:col-span-2" value={vals.notes} onChange={e => set({...vals, notes: e.target.value})} /></FL>
            </div>
          )}
        />
      ))}
    </SubList>
  )
}

// ── Labour tab ─────────────────────────────────────────────────────────────────

function LabourTab({ jobId, uid }: { jobId: string; uid: string }) {
  const { data: items, loading } = useJobSubCollection<any>(jobId, 'labour', 'date')
  const today = new Date().toISOString().slice(0, 10)
  const EMPTY = { description: '', date: today, hours: '', ratePerHour: '', totalCost: '', worker: '', notes: '' }
  const [addVals, setAddVals] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  function calcLabourTotal(hrs: string, rate: string) {
    return String(Number(hrs || 0) * Number(rate || 0))
  }

  async function create(close: () => void) {
    if (!addVals.description || !addVals.hours) return
    setAddSaving(true)
    await addDoc(collection(db, jobSubPath(uid, jobId, 'labour')), {
      ...addVals, hours: Number(addVals.hours || 0), ratePerHour: Number(addVals.ratePerHour || 0),
      totalCost: Number(addVals.totalCost || 0), jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
    setAddVals(EMPTY)
    setAddSaving(false)
    close()
  }

  async function save(id: string, vals: any) {
    await updateDoc(doc(db, jobSubPath(uid, jobId, 'labour'), id), {
      ...vals, hours: Number(vals.hours || 0), ratePerHour: Number(vals.ratePerHour || 0),
      totalCost: Number(vals.totalCost || 0), updatedAt: serverTimestamp(),
    })
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  async function remove(id: string) {
    if (!confirm('Delete this labour entry?')) return
    await deleteDoc(doc(db, jobSubPath(uid, jobId, 'labour'), id))
    recalcJobTotals(uid, jobId).catch(console.error)
  }

  const totalHours = items.reduce((a, l) => a + Number(l.hours || 0), 0)
  const totalCost = items.reduce((a, l) => a + Number(l.totalCost || 0), 0)

  return (
    <SubList items={items} loading={loading} emptyText="No labour entries yet. Log time spent on this job."
      addForm={
        <AddForm label="Log Labour" icon={Clock}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FL label="Description *"><input className="wj-input sm:col-span-2" placeholder="e.g. Site prep, Electrical install" value={addVals.description} onChange={e => setAddVals(p => ({...p, description: e.target.value}))} /></FL>
                <FL label="Date"><input className="wj-input" type="date" value={addVals.date} onChange={e => setAddVals(p => ({...p, date: e.target.value}))} /></FL>
                <FL label="Worker"><input className="wj-input" placeholder="Your name or team member" value={addVals.worker} onChange={e => setAddVals(p => ({...p, worker: e.target.value}))} /></FL>
                <FL label="Hours *"><input className="wj-input" type="number" step="0.25" placeholder="e.g. 4.5" value={addVals.hours} onChange={e => setAddVals(p => ({...p, hours: e.target.value, totalCost: calcLabourTotal(e.target.value, p.ratePerHour)}))} /></FL>
                <FL label="Rate/hr ($)"><input className="wj-input" type="number" value={addVals.ratePerHour} onChange={e => setAddVals(p => ({...p, ratePerHour: e.target.value, totalCost: calcLabourTotal(p.hours, e.target.value)}))} /></FL>
                <FL label="Total cost ($)"><input className="wj-input" type="number" value={addVals.totalCost} onChange={e => setAddVals(p => ({...p, totalCost: e.target.value}))} /></FL>
                <FL label="Notes"><input className="wj-input sm:col-span-2" value={addVals.notes} onChange={e => setAddVals(p => ({...p, notes: e.target.value}))} /></FL>
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addVals.description || !addVals.hours} onClick={() => create(close)}>
                  {addSaving ? 'Saving…' : 'Save Labour'}
                </button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddForm>
      }
    >
      {items.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-purple-400/5 px-4 py-2 text-sm flex gap-6">
          <span><span className="text-zinc-400">Total hours: </span><strong className="text-purple-300">{totalHours.toFixed(1)}</strong></span>
          {totalCost > 0 && <span><span className="text-zinc-400">Labour cost: </span><strong className="text-purple-300">{formatCurrency(totalCost)}</strong></span>}
        </div>
      )}
      {items.map(item => (
        <EditableItem key={item.id} item={item} onSave={save} onDelete={remove}
          defaultVals={i => ({ description: i.description || '', date: i.date || today, hours: String(i.hours || ''), ratePerHour: String(i.ratePerHour || ''), totalCost: String(i.totalCost || ''), worker: i.worker || '', notes: i.notes || '' })}
          viewContent={
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{item.description}</span>
                {item.totalCost > 0 && <span className="ml-auto text-sm font-bold text-purple-300">{formatCurrency(item.totalCost)}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                {item.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{item.date}</span>}
                {item.hours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.hours}h</span>}
                {item.ratePerHour > 0 && <span>@ {formatCurrency(item.ratePerHour)}/hr</span>}
                {item.worker && <span>— {item.worker}</span>}
              </div>
              {item.notes && <p className="mt-1 text-xs text-zinc-500">{item.notes}</p>}
            </div>
          }
          editContent={(vals, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <FL label="Description *"><input className="wj-input sm:col-span-2" value={vals.description} onChange={e => set({...vals, description: e.target.value})} /></FL>
              <FL label="Date"><input className="wj-input" type="date" value={vals.date} onChange={e => set({...vals, date: e.target.value})} /></FL>
              <FL label="Worker"><input className="wj-input" value={vals.worker} onChange={e => set({...vals, worker: e.target.value})} /></FL>
              <FL label="Hours"><input className="wj-input" type="number" step="0.25" value={vals.hours} onChange={e => set({...vals, hours: e.target.value, totalCost: calcLabourTotal(e.target.value, vals.ratePerHour)})} /></FL>
              <FL label="Rate/hr ($)"><input className="wj-input" type="number" value={vals.ratePerHour} onChange={e => set({...vals, ratePerHour: e.target.value, totalCost: calcLabourTotal(vals.hours, e.target.value)})} /></FL>
              <FL label="Total ($)"><input className="wj-input" type="number" value={vals.totalCost} onChange={e => set({...vals, totalCost: e.target.value})} /></FL>
              <FL label="Notes"><input className="wj-input sm:col-span-2" value={vals.notes} onChange={e => set({...vals, notes: e.target.value})} /></FL>
            </div>
          )}
        />
      ))}
    </SubList>
  )
}

// ── Events / Notes tab ─────────────────────────────────────────────────────────

function EventsTab({ jobId, uid }: { jobId: string; uid: string }) {
  const { data: items, loading } = useJobSubCollection<any>(jobId, 'events', 'createdAt')
  const EVENT_TYPES = ['note', 'site_visit', 'call', 'other'] as const
  const EMPTY = { content: '', eventType: 'note' as string }
  const [addVals, setAddVals] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addVals.content.trim()) return
    setAddSaving(true)
    await addDoc(collection(db, jobSubPath(uid, jobId, 'events')), {
      ...addVals, jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    setAddVals(EMPTY)
    setAddSaving(false)
    close()
  }

  async function save(id: string, vals: any) {
    await updateDoc(doc(db, jobSubPath(uid, jobId, 'events'), id), { ...vals, updatedAt: serverTimestamp() })
  }

  async function remove(id: string) {
    if (!confirm('Delete this note?')) return
    await deleteDoc(doc(db, jobSubPath(uid, jobId, 'events'), id))
  }

  const typeLabel: Record<string, string> = { note: 'Note', site_visit: 'Site visit', call: 'Call', other: 'Other' }
  const typeBadge: Record<string, string> = {
    note:       'bg-blue-400/10 text-blue-300 border-blue-400/20',
    site_visit: 'bg-green-400/10 text-green-300 border-green-400/20',
    call:       'bg-amber-400/10 text-amber-300 border-amber-400/20',
    other:      'bg-zinc-400/10 text-zinc-300 border-zinc-400/20',
  }

  return (
    <SubList items={items} loading={loading} emptyText="No notes or events yet. Log a site visit, call, or note."
      addForm={
        <AddForm label="Add Note / Event" icon={MessageSquare}>
          {close => (
            <div className="space-y-3">
              <FL label="Type">
                <select className="wj-input" value={addVals.eventType} onChange={e => setAddVals(p => ({...p, eventType: e.target.value}))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                </select>
              </FL>
              <FL label="Content *">
                <textarea className="wj-input min-h-24" placeholder="Add your note here…" value={addVals.content} onChange={e => setAddVals(p => ({...p, content: e.target.value}))} />
              </FL>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addVals.content.trim()} onClick={() => create(close)}>
                  {addSaving ? 'Saving…' : 'Save'}
                </button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddForm>
      }
    >
      {items.map(item => (
        <EditableItem key={item.id} item={item} onSave={save} onDelete={remove}
          defaultVals={i => ({ content: i.content || '', eventType: i.eventType || 'note' })}
          viewContent={
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn('wj-badge', typeBadge[item.eventType] ?? '')}>{typeLabel[item.eventType] ?? item.eventType}</span>
                {item.createdAt?.toDate && (
                  <span className="text-xs text-zinc-600">
                    {item.createdAt.toDate().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{item.content}</p>
            </div>
          }
          editContent={(vals, set) => (
            <div className="space-y-3">
              <FL label="Type">
                <select className="wj-input" value={vals.eventType} onChange={e => set({...vals, eventType: e.target.value})}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                </select>
              </FL>
              <FL label="Content">
                <textarea className="wj-input min-h-20" value={vals.content} onChange={e => set({...vals, content: e.target.value})} />
              </FL>
            </div>
          )}
        />
      ))}
    </SubList>
  )
}

// ── Tasks tab ──────────────────────────────────────────────────────────────────

function TasksTab({ jobId, uid }: { jobId: string; uid: string }) {
  const { data: items, loading } = useJobSubCollection<any>(jobId, 'tasks', 'createdAt')
  const EMPTY = { title: '', dueDate: '' }
  const [addVals, setAddVals] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addVals.title.trim()) return
    setAddSaving(true)
    await addDoc(collection(db, jobSubPath(uid, jobId, 'tasks')), {
      ...addVals, done: false, jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    setAddVals(EMPTY)
    setAddSaving(false)
    close()
  }

  async function toggle(item: any) {
    await updateDoc(doc(db, jobSubPath(uid, jobId, 'tasks'), item.id), {
      done: !item.done, updatedAt: serverTimestamp(),
    })
  }

  async function remove(id: string) {
    if (!confirm('Delete this task?')) return
    await deleteDoc(doc(db, jobSubPath(uid, jobId, 'tasks'), id))
  }

  const done = items.filter(t => t.done).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {items.length > 0 && (
          <p className="text-xs text-zinc-500">{done}/{items.length} done</p>
        )}
        <div className="ml-auto">
          <AddForm label="Add Task" icon={CheckSquare}>
            {close => (
              <div className="space-y-3">
                <FL label="Task *"><input className="wj-input" placeholder="e.g. Order materials, call customer" value={addVals.title} onChange={e => setAddVals(p => ({...p, title: e.target.value}))} /></FL>
                <FL label="Due date"><input className="wj-input" type="date" value={addVals.dueDate} onChange={e => setAddVals(p => ({...p, dueDate: e.target.value}))} /></FL>
                <div className="flex gap-2">
                  <button className="wj-btn-primary" disabled={addSaving || !addVals.title.trim()} onClick={() => create(close)}>
                    {addSaving ? 'Saving…' : 'Save Task'}
                  </button>
                  <button className="wj-btn-ghost" onClick={close}>Cancel</button>
                </div>
              </div>
            )}
          </AddForm>
        </div>
      </div>
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="wj-card p-6 text-center text-sm text-zinc-500">No tasks yet.</div>
      )}
      {items.map(item => (
        <div key={item.id} className="wj-card flex items-center gap-3 p-4 group">
          <button
            onClick={() => toggle(item)}
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition',
              item.done ? 'border-green-400 bg-green-400/20' : 'border-zinc-600 hover:border-amber-400'
            )}
          >
            {item.done && <span className="text-xs text-green-300 leading-none">✓</span>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm', item.done && 'text-zinc-500 line-through')}>{item.title}</p>
            {item.dueDate && <p className="text-xs text-zinc-500">Due: {item.dueDate}</p>}
          </div>
          <button
            onClick={() => remove(item.id)}
            className="wj-btn-ghost shrink-0 p-2 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-300 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── PDF Export ─────────────────────────────────────────────────────────────────

async function exportJobPack(job: any, uid: string) {
  const base = `users/${uid}/jobs/${job.id}`
  const [qSnap, iSnap, mSnap, pSnap, lSnap, eSnap] = await Promise.all([
    getDocs(collection(db, `${base}/quotes`)),
    getDocs(collection(db, `${base}/invoices`)),
    getDocs(collection(db, `${base}/materials`)),
    getDocs(collection(db, `${base}/payments`)),
    getDocs(collection(db, `${base}/labour`)),
    getDocs(collection(db, `${base}/events`)),
  ])
  const quotes    = qSnap.docs.map(d => d.data())
  const invoices  = iSnap.docs.map(d => d.data())
  const materials = mSnap.docs.map(d => d.data())
  const payments  = pSnap.docs.map(d => d.data())
  const labour    = lSnap.docs.map(d => d.data())
  const events    = eSnap.docs.map(d => d.data())

  const fmt = (n?: number | null) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(n || 0))
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const section = (title: string, rows: string[]) => rows.length === 0 ? '' : `
    <section>
      <h2>${title}</h2>
      ${rows.map(r => `<p class="row">${r}</p>`).join('')}
    </section>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Job Pack — ${job.jobTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 800px; margin: auto; }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #555; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; margin: 20px 0 8px; }
  .row { padding: 4px 0; border-bottom: 1px solid #f5f5f5; }
  .row:last-child { border-bottom: none; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
  .summary-cell { background: #f9f9f9; border-radius: 6px; padding: 10px 12px; }
  .summary-cell .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #777; }
  .summary-cell .val { font-size: 16px; font-weight: 800; margin-top: 2px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${job.jobTitle}</h1>
<p class="meta">Generated ${date} · TradieDay Work Journal</p>

<section>
  <h2>Client &amp; Job Info</h2>
  ${[
    job.customerName ? `<p class="row"><strong>Customer:</strong> ${job.customerName}</p>` : '',
    job.customerPhone ? `<p class="row"><strong>Phone:</strong> ${job.customerPhone}</p>` : '',
    job.customerEmail ? `<p class="row"><strong>Email:</strong> ${job.customerEmail}</p>` : '',
    job.siteAddress ? `<p class="row"><strong>Site:</strong> ${job.siteAddress}</p>` : '',
    job.startDate ? `<p class="row"><strong>Start date:</strong> ${job.startDate}</p>` : '',
    job.dueDate ? `<p class="row"><strong>Due date:</strong> ${job.dueDate}</p>` : '',
    job.jobDescription ? `<p class="row"><strong>Description:</strong> ${job.jobDescription}</p>` : '',
  ].join('')}
</section>

<div class="summary">
  <div class="summary-cell"><div class="label">Quoted</div><div class="val">${fmt(job.totalQuoted)}</div></div>
  <div class="summary-cell"><div class="label">Invoiced</div><div class="val">${fmt(job.totalInvoiced)}</div></div>
  <div class="summary-cell"><div class="label">Paid</div><div class="val">${fmt(job.totalPaid)}</div></div>
  <div class="summary-cell"><div class="label">Materials</div><div class="val">${fmt(job.totalMaterials)}</div></div>
  <div class="summary-cell"><div class="label">Labour</div><div class="val">${fmt(job.totalLabour)}</div></div>
  <div class="summary-cell"><div class="label">Balance Due</div><div class="val">${fmt(job.balanceDue)}</div></div>
</div>

${section('Quotes', quotes.map(q => `${q.quoteNumber || 'Quote'} · ${q.status} · ${fmt(q.total)}${q.description ? ' — ' + q.description : ''}`))}
${section('Invoices', invoices.map(i => `${i.invoiceNumber || 'Invoice'} · ${i.status} · Total: ${fmt(i.total)} · Paid: ${fmt(i.amountPaid)} · Owing: ${fmt(i.balanceOwing)}`))}
${section('Materials', materials.map(m => `${m.name}${m.supplier ? ' (' + m.supplier + ')' : ''} · Qty: ${m.quantity || 1} · ${fmt(m.totalCost)}`))}
${section('Labour', labour.map(l => `${l.description}${l.date ? ' · ' + l.date : ''}${l.hours ? ' · ' + l.hours + 'h' : ''}${l.worker ? ' · ' + l.worker : ''} · ${fmt(l.totalCost)}`))}
${section('Payments', payments.map(p => `${fmt(p.amount)} · ${p.method || 'Manual'}${p.paymentDate ? ' · ' + p.paymentDate : ''}${p.reference ? ' · Ref: ' + p.reference : ''}`))}
${section('Notes & Events', events.map(e => `[${e.eventType || 'note'}] ${e.content}`))}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${job.jobTitle.replace(/[^a-z0-9]/gi, '_')}_job_pack.html`
  a.click()
  URL.revokeObjectURL(url)

  // Open in new tab for immediate printing / PDF save
  window.open(url, '_blank')
}

// ── Main ───────────────────────────────────────────────────────────────────────

const TABS: Array<{ id: JobSubTab; label: string; icon: any }> = [
  { id: 'overview',  label: 'Overview',  icon: ClipboardList },
  { id: 'quotes',    label: 'Quotes',    icon: FileText      },
  { id: 'invoices',  label: 'Invoices',  icon: Receipt       },
  { id: 'materials', label: 'Materials', icon: Package       },
  { id: 'labour',    label: 'Labour',    icon: Clock         },
  { id: 'events',    label: 'Notes',     icon: MessageSquare },
  { id: 'tasks',     label: 'Tasks',     icon: CheckSquare   },
]

export default function JobDetail() {
  const params = useParams<{ id: string }>()
  const jobId = params.id
  const { user, job, loading } = useJob(jobId)
  const [tab, setTab] = useState<JobSubTab>('overview')
  const [exporting, setExporting] = useState(false)

  if (user === undefined || loading) {
    return <div className="p-4 text-sm text-zinc-500">Loading job…</div>
  }
  if (!user) {
    return <div className="p-4 text-sm text-red-300">Not signed in.</div>
  }
  if (!job) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-zinc-400">Job not found.</p>
        <Link href="/jobs" className="wj-btn-ghost"><ArrowLeft className="h-4 w-4" /> Back to jobs</Link>
      </div>
    )
  }

  const uid = user.uid

  async function handleExport() {
    setExporting(true)
    try { await exportJobPack(job, uid) } catch (e) { console.error(e) }
    setExporting(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/jobs" className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="h-3 w-3" /> All Jobs
          </Link>
          <h1 className="text-2xl font-black tracking-tight">{job.jobTitle}</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {job.customerName}{job.siteAddress ? ` · ${job.siteAddress}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className={cn('wj-badge capitalize', priorityColor[job.priority] ?? '')}>
              {job.priority ?? 'normal'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col sm:items-end">
          <Link href={`/jobs/${jobId}/edit`} className="wj-btn-secondary">
            <Edit className="h-4 w-4" /> Edit Job
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="wj-btn-ghost border border-white/10"
            title="Export Job Pack PDF"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Pack'}
          </button>
        </div>
      </div>

      {/* Financial summary */}
      <FinancialSummary job={job} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-1.5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
              tab === t.id
                ? 'bg-gradient-to-r from-red-600/80 to-amber-500/60 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview'  && <OverviewTab  job={job} uid={uid} />}
        {tab === 'quotes'    && <QuotesTab    jobId={jobId} uid={uid} />}
        {tab === 'invoices'  && <InvoicesTab  jobId={jobId} uid={uid} />}
        {tab === 'materials' && <MaterialsTab jobId={jobId} uid={uid} />}
        {tab === 'labour'    && <LabourTab    jobId={jobId} uid={uid} />}
        {tab === 'events'    && <EventsTab    jobId={jobId} uid={uid} />}
        {tab === 'tasks'     && <TasksTab     jobId={jobId} uid={uid} />}
      </div>
    </div>
  )
}
