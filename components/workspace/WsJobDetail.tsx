'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import {
  ArrowLeft, Banknote, Calendar, CheckSquare, ClipboardList, Clock,
  Download, Edit, Edit2, FileText, MessageSquare, Package,
  Plus, Receipt, Save, Trash2, X,
} from 'lucide-react'
import { db } from '@/lib/firebase/client'
import { wsCollectionPath, wsJobSubPath, getWorkspace, type WorkspaceId } from '@/lib/workspaces'
import {
  useWorkspaceJob,
  useWorkspaceJobSub,
} from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
import { cn, jobStatusLabel, priorityColor, statusColor } from '@/lib/utils'
import type { JobSubTab, JobStatus } from '@/types/app'
import { exportPetLetInvoice } from '@/components/workspace/PetLetInvoice'

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('wj-badge capitalize', statusColor[status] ?? 'bg-white/5 text-zinc-400 border-white/10')}>
      {jobStatusLabel[status] ?? status}
    </span>
  )
}

function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="wj-label">{label}</span>
      {children}
    </label>
  )
}

// ── Recalc totals ──────────────────────────────────────────────────────────────

async function recalcTotals(uid: string, wsId: string, jobId: string) {
  const base = `users/${uid}/workspaces/${wsId}/jobs/${jobId}`
  const [qS, iS, mS, pS, lS] = await Promise.all([
    getDocs(collection(db, `${base}/quotes`)),
    getDocs(collection(db, `${base}/invoices`)),
    getDocs(collection(db, `${base}/materials`)),
    getDocs(collection(db, `${base}/payments`)),
    getDocs(collection(db, `${base}/labour`)),
  ])
  const totalQuoted    = qS.docs.map(d => d.data()).filter(q => q.status === 'ACCEPTED').reduce((a, q) => a + Number(q.total || 0), 0)
  const totalInvoiced  = iS.docs.map(d => d.data()).reduce((a, i) => a + Number(i.total || 0), 0)
  const totalPaid      = pS.docs.map(d => d.data()).reduce((a, p) => a + Number(p.amount || 0), 0)
  const totalMaterials = mS.docs.map(d => d.data()).reduce((a, m) => a + Number(m.totalCost || 0), 0)
  const totalLabour    = lS.docs.map(d => d.data()).reduce((a, l) => a + Number(l.totalCost || 0), 0)
  const balanceDue     = Math.max(0, totalInvoiced - totalPaid)
  await updateDoc(doc(db, `users/${uid}/workspaces/${wsId}/jobs`, jobId), {
    totalQuoted, totalInvoiced, totalPaid, totalMaterials, totalLabour, balanceDue, updatedAt: serverTimestamp(),
  })
}

// ── Inline editable card ───────────────────────────────────────────────────────

function EditableCard({ item, onSave, onDelete, view, editForm, defaults }: {
  item: any; onSave: (id: string, v: any) => Promise<void>; onDelete: (id: string) => void;
  view: React.ReactNode; editForm: (v: any, set: (v: any) => void) => React.ReactNode;
  defaults: (item: any) => any;
}) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState<any>({})
  const [saving, setSaving] = useState(false)

  function startEdit() { setVals(defaults(item)); setEditing(true) }
  async function save() { setSaving(true); await onSave(item.id, vals); setSaving(false); setEditing(false) }

  if (editing) return (
    <div className="wj-card border-amber-400/30 p-4 space-y-3">
      {editForm(vals, setVals)}
      <div className="flex gap-2">
        <button className="wj-btn-primary" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}</button>
        <button className="wj-btn-ghost" onClick={() => setEditing(false)} disabled={saving}><X className="h-3.5 w-3.5" /> Cancel</button>
      </div>
    </div>
  )
  return (
    <div className="wj-card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{view}</div>
        <div className="flex shrink-0 gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button onClick={startEdit} className="wj-btn-ghost p-2 text-zinc-400 hover:text-amber-300"><Edit2 className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(item.id)} className="wj-btn-ghost p-2 text-zinc-500 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  )
}

// ── Add-form panel ─────────────────────────────────────────────────────────────

function AddPanel({ label, icon: Icon, children }: { label: string; icon: any; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false)
  if (!open) return <button onClick={() => setOpen(true)} className="wj-btn-primary"><Plus className="h-4 w-4" /> {label}</button>
  return (
    <div className="wj-card w-full border-amber-400/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-bold">{label}</h3>
        <button onClick={() => setOpen(false)} className="ml-auto text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      {children(() => setOpen(false))}
    </div>
  )
}

// ── Financial summary ──────────────────────────────────────────────────────────

function FinancialSummary({ job }: { job: any }) {
  const items = [
    { label: 'Quoted', value: job.totalQuoted, cls: 'text-blue-300' },
    { label: 'Invoiced', value: job.totalInvoiced, cls: 'text-orange-300' },
    { label: 'Paid', value: job.totalPaid, cls: 'text-green-300' },
    { label: 'Materials', value: job.totalMaterials, cls: 'text-amber-300' },
    { label: 'Labour', value: job.totalLabour, cls: 'text-purple-300' },
    { label: 'Balance Due', value: job.balanceDue, cls: 'text-red-300' },
  ]
  return (
    <div className="wj-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Financial Summary</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map(item => (
          <div key={item.label} className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-zinc-500">{item.label}</p>
            <p className={cn('mt-1 text-sm font-bold', item.cls)}>{item.value != null ? formatCurrency(item.value) : '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PetLet Labour tab (extended fields) ───────────────────────────────────────

const PETLET_WORK_TYPES = ['Maintenance', 'Garden Maintenance', 'Extra Approved Task', 'Materials', 'Other']

function PetLetLabourTab({ jobId, uid, wsId }: { jobId: string; uid: string; wsId: string }) {
  const { data: items, loading } = useWorkspaceJobSub<any>(wsId, jobId, 'labour', 'date')
  const today = new Date().toISOString().slice(0, 10)
  const EMPTY = { date: today, petletProperty: '', workType: 'Maintenance', description: '', hours: '', rate: '', amount: '', receiptAttached: false, preApproved: false, notes: '' }
  const [addV, setAddV] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addV.description) return
    setAddSaving(true)
    const amount = Number(addV.amount) || (Number(addV.hours || 0) * Number(addV.rate || 0))
    await addDoc(collection(db, wsJobSubPath(uid, wsId, jobId, 'labour')), {
      ...addV, hours: Number(addV.hours || 0), rate: Number(addV.rate || 0), amount, totalCost: amount,
      jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    recalcTotals(uid, wsId, jobId).catch(console.error)
    setAddV(EMPTY); setAddSaving(false); close()
  }

  async function save(id: string, vals: any) {
    const amount = Number(vals.amount) || (Number(vals.hours || 0) * Number(vals.rate || 0))
    await updateDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'labour'), id), { ...vals, amount, totalCost: amount, updatedAt: serverTimestamp() })
    recalcTotals(uid, wsId, jobId).catch(console.error)
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    await deleteDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'labour'), id))
    recalcTotals(uid, wsId, jobId).catch(console.error)
  }

  const total = items.reduce((a, l) => a + Number(l.amount || l.totalCost || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AddPanel label="Log Work" icon={Clock}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FL label="Date"><input className="wj-input" type="date" value={addV.date} onChange={e => setAddV(p => ({...p, date: e.target.value}))} /></FL>
                <FL label="Property code"><input className="wj-input" placeholder="e.g. 36H, 9B" value={addV.petletProperty} onChange={e => setAddV(p => ({...p, petletProperty: e.target.value}))} /></FL>
                <FL label="Work type">
                  <select className="wj-input" value={addV.workType} onChange={e => setAddV(p => ({...p, workType: e.target.value}))}>
                    {PETLET_WORK_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </FL>
                <FL label="Description *"><input className="wj-input sm:col-span-2" placeholder="What was done" value={addV.description} onChange={e => setAddV(p => ({...p, description: e.target.value}))} /></FL>
                <FL label="Qty / Hours"><input className="wj-input" type="number" step="0.25" value={addV.hours} onChange={e => setAddV(p => ({...p, hours: e.target.value, amount: String(Number(e.target.value||0)*Number(p.rate||0))}))} /></FL>
                <FL label="Rate ($)"><input className="wj-input" type="number" value={addV.rate} onChange={e => setAddV(p => ({...p, rate: e.target.value, amount: String(Number(p.hours||0)*Number(e.target.value||0))}))} /></FL>
                <FL label="Amount ($)"><input className="wj-input" type="number" value={addV.amount} onChange={e => setAddV(p => ({...p, amount: e.target.value}))} /></FL>
                <FL label="Notes"><input className="wj-input" value={addV.notes} onChange={e => setAddV(p => ({...p, notes: e.target.value}))} /></FL>
                <div className="flex gap-4 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={addV.receiptAttached} onChange={e => setAddV(p => ({...p, receiptAttached: e.target.checked}))} /> Receipt attached</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={addV.preApproved} onChange={e => setAddV(p => ({...p, preApproved: e.target.checked}))} /> Pre-approved</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addV.description} onClick={() => create(close)}>{addSaving ? 'Saving…' : 'Save Entry'}</button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddPanel>
      </div>

      {!loading && items.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-cyan-400/5 px-4 py-2 text-sm">
          <span className="text-zinc-400">Total: </span><strong className="text-cyan-300">{formatCurrency(total)}</strong>
        </div>
      )}

      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {!loading && items.length === 0 && <div className="wj-card p-6 text-center text-sm text-zinc-500">No work entries yet.</div>}

      {items.map(item => (
        <EditableCard key={item.id} item={item} onSave={save} onDelete={remove}
          defaults={i => ({ date: i.date || today, petletProperty: i.petletProperty || '', workType: i.workType || 'Maintenance', description: i.description || '', hours: String(i.hours || ''), rate: String(i.rate || ''), amount: String(i.amount || i.totalCost || ''), receiptAttached: !!i.receiptAttached, preApproved: !!i.preApproved, notes: i.notes || '' })}
          view={
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {item.petletProperty && <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded">{item.petletProperty}</span>}
                <span className="wj-badge">{item.workType}</span>
                {item.date && <span className="flex items-center gap-1 text-xs text-zinc-500"><Calendar className="h-3 w-3" />{item.date}</span>}
                <span className="ml-auto font-bold text-cyan-300">{formatCurrency(item.amount || item.totalCost)}</span>
              </div>
              <p className="mt-1 text-sm">{item.description}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                {item.hours > 0 && <span><Clock className="inline h-3 w-3" /> {item.hours}h</span>}
                {item.rate > 0 && <span>@ {formatCurrency(item.rate)}</span>}
                {item.receiptAttached && <span className="text-green-400">✓ Receipt</span>}
                {item.preApproved && <span className="text-cyan-400">✓ Pre-approved</span>}
              </div>
            </div>
          }
          editForm={(vals, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <FL label="Date"><input className="wj-input" type="date" value={vals.date} onChange={e => set({...vals, date: e.target.value})} /></FL>
              <FL label="Property"><input className="wj-input" value={vals.petletProperty} onChange={e => set({...vals, petletProperty: e.target.value})} /></FL>
              <FL label="Work type">
                <select className="wj-input" value={vals.workType} onChange={e => set({...vals, workType: e.target.value})}>
                  {PETLET_WORK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FL>
              <FL label="Description"><input className="wj-input sm:col-span-2" value={vals.description} onChange={e => set({...vals, description: e.target.value})} /></FL>
              <FL label="Hours"><input className="wj-input" type="number" step="0.25" value={vals.hours} onChange={e => set({...vals, hours: e.target.value, amount: String(Number(e.target.value||0)*Number(vals.rate||0))})} /></FL>
              <FL label="Rate ($)"><input className="wj-input" type="number" value={vals.rate} onChange={e => set({...vals, rate: e.target.value, amount: String(Number(vals.hours||0)*Number(e.target.value||0))})} /></FL>
              <FL label="Amount ($)"><input className="wj-input" type="number" value={vals.amount} onChange={e => set({...vals, amount: e.target.value})} /></FL>
              <FL label="Notes"><input className="wj-input" value={vals.notes} onChange={e => set({...vals, notes: e.target.value})} /></FL>
              <div className="flex gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={vals.receiptAttached} onChange={e => set({...vals, receiptAttached: e.target.checked})} /> Receipt</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={vals.preApproved} onChange={e => set({...vals, preApproved: e.target.checked})} /> Pre-approved</label>
              </div>
            </div>
          )}
        />
      ))}
    </div>
  )
}

// ── Standard Labour tab (My Business) ─────────────────────────────────────────

function LabourTab({ jobId, uid, wsId }: { jobId: string; uid: string; wsId: string }) {
  const { data: items, loading } = useWorkspaceJobSub<any>(wsId, jobId, 'labour', 'date')
  const today = new Date().toISOString().slice(0, 10)
  const EMPTY = { description: '', date: today, hours: '', ratePerHour: '', totalCost: '', worker: '', notes: '' }
  const [addV, setAddV] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addV.description || !addV.hours) return
    setAddSaving(true)
    const totalCost = Number(addV.totalCost) || Number(addV.hours || 0) * Number(addV.ratePerHour || 0)
    await addDoc(collection(db, wsJobSubPath(uid, wsId, jobId, 'labour')), {
      ...addV, hours: Number(addV.hours || 0), ratePerHour: Number(addV.ratePerHour || 0), totalCost,
      jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    recalcTotals(uid, wsId, jobId).catch(console.error)
    setAddV(EMPTY); setAddSaving(false); close()
  }

  async function save(id: string, vals: any) {
    const totalCost = Number(vals.totalCost) || Number(vals.hours || 0) * Number(vals.ratePerHour || 0)
    await updateDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'labour'), id), { ...vals, totalCost, updatedAt: serverTimestamp() })
    recalcTotals(uid, wsId, jobId).catch(console.error)
  }

  async function remove(id: string) {
    if (!confirm('Delete?')) return
    await deleteDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'labour'), id))
    recalcTotals(uid, wsId, jobId).catch(console.error)
  }

  const total = items.reduce((a, l) => a + Number(l.totalCost || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AddPanel label="Log Labour" icon={Clock}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FL label="Description *"><input className="wj-input sm:col-span-2" placeholder="e.g. Site prep" value={addV.description} onChange={e => setAddV(p => ({...p, description: e.target.value}))} /></FL>
                <FL label="Date"><input className="wj-input" type="date" value={addV.date} onChange={e => setAddV(p => ({...p, date: e.target.value}))} /></FL>
                <FL label="Worker"><input className="wj-input" value={addV.worker} onChange={e => setAddV(p => ({...p, worker: e.target.value}))} /></FL>
                <FL label="Hours *"><input className="wj-input" type="number" step="0.25" value={addV.hours} onChange={e => setAddV(p => ({...p, hours: e.target.value, totalCost: String(Number(e.target.value||0)*Number(p.ratePerHour||0))}))} /></FL>
                <FL label="Rate/hr ($)"><input className="wj-input" type="number" value={addV.ratePerHour} onChange={e => setAddV(p => ({...p, ratePerHour: e.target.value, totalCost: String(Number(p.hours||0)*Number(e.target.value||0))}))} /></FL>
                <FL label="Total ($)"><input className="wj-input" type="number" value={addV.totalCost} onChange={e => setAddV(p => ({...p, totalCost: e.target.value}))} /></FL>
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving} onClick={() => create(close)}>{addSaving ? 'Saving…' : 'Save'}</button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddPanel>
      </div>
      {!loading && total > 0 && <div className="rounded-xl border border-white/10 bg-purple-400/5 px-4 py-2 text-sm"><span className="text-zinc-400">Labour: </span><strong className="text-purple-300">{formatCurrency(total)}</strong></div>}
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {!loading && items.length === 0 && <div className="wj-card p-6 text-center text-sm text-zinc-500">No labour entries yet.</div>}
      {items.map(item => (
        <EditableCard key={item.id} item={item} onSave={save} onDelete={remove}
          defaults={i => ({ description: i.description || '', date: i.date || today, hours: String(i.hours || ''), ratePerHour: String(i.ratePerHour || ''), totalCost: String(i.totalCost || ''), worker: i.worker || '', notes: i.notes || '' })}
          view={<div><div className="flex items-center gap-2"><span className="font-semibold">{item.description}</span>{item.totalCost > 0 && <span className="ml-auto font-bold text-purple-300">{formatCurrency(item.totalCost)}</span>}</div><div className="mt-1 flex gap-3 text-xs text-zinc-500">{item.date && <span><Calendar className="inline h-3 w-3" /> {item.date}</span>}{item.hours > 0 && <span><Clock className="inline h-3 w-3" /> {item.hours}h</span>}{item.worker && <span>— {item.worker}</span>}</div></div>}
          editForm={(vals, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <FL label="Description"><input className="wj-input sm:col-span-2" value={vals.description} onChange={e => set({...vals, description: e.target.value})} /></FL>
              <FL label="Date"><input className="wj-input" type="date" value={vals.date} onChange={e => set({...vals, date: e.target.value})} /></FL>
              <FL label="Worker"><input className="wj-input" value={vals.worker} onChange={e => set({...vals, worker: e.target.value})} /></FL>
              <FL label="Hours"><input className="wj-input" type="number" step="0.25" value={vals.hours} onChange={e => set({...vals, hours: e.target.value, totalCost: String(Number(e.target.value||0)*Number(vals.ratePerHour||0))})} /></FL>
              <FL label="Rate/hr ($)"><input className="wj-input" type="number" value={vals.ratePerHour} onChange={e => set({...vals, ratePerHour: e.target.value, totalCost: String(Number(vals.hours||0)*Number(e.target.value||0))})} /></FL>
              <FL label="Total ($)"><input className="wj-input" type="number" value={vals.totalCost} onChange={e => set({...vals, totalCost: e.target.value})} /></FL>
            </div>
          )}
        />
      ))}
    </div>
  )
}

// ── Notes tab ──────────────────────────────────────────────────────────────────

function NotesTab({ jobId, uid, wsId }: { jobId: string; uid: string; wsId: string }) {
  const { data: items, loading } = useWorkspaceJobSub<any>(wsId, jobId, 'events', 'createdAt')
  const EMPTY = { content: '', eventType: 'note' }
  const [addV, setAddV] = useState(EMPTY)
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    if (!addV.content.trim()) return
    setAddSaving(true)
    await addDoc(collection(db, wsJobSubPath(uid, wsId, jobId, 'events')), { ...addV, jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    setAddV(EMPTY); setAddSaving(false); close()
  }

  async function save(id: string, vals: any) {
    await updateDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'events'), id), { ...vals, updatedAt: serverTimestamp() })
  }

  async function remove(id: string) {
    if (!confirm('Delete?')) return
    await deleteDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'events'), id))
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AddPanel label="Add Note" icon={MessageSquare}>
          {close => (
            <div className="space-y-3">
              <FL label="Type">
                <select className="wj-input" value={addV.eventType} onChange={e => setAddV(p => ({...p, eventType: e.target.value}))}>
                  {['note','site_visit','call','other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </FL>
              <FL label="Note *"><textarea className="wj-input min-h-24" value={addV.content} onChange={e => setAddV(p => ({...p, content: e.target.value}))} /></FL>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving || !addV.content.trim()} onClick={() => create(close)}>{addSaving ? 'Saving…' : 'Save'}</button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddPanel>
      </div>
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {!loading && items.length === 0 && <div className="wj-card p-6 text-center text-sm text-zinc-500">No notes yet.</div>}
      {items.map(item => (
        <EditableCard key={item.id} item={item} onSave={save} onDelete={remove}
          defaults={i => ({ content: i.content || '', eventType: i.eventType || 'note' })}
          view={<div><span className="wj-badge capitalize">{item.eventType}</span><p className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">{item.content}</p></div>}
          editForm={(vals, set) => (
            <div className="space-y-3">
              <FL label="Type">
                <select className="wj-input" value={vals.eventType} onChange={e => set({...vals, eventType: e.target.value})}>
                  {['note','site_visit','call','other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </FL>
              <FL label="Note"><textarea className="wj-input min-h-20" value={vals.content} onChange={e => set({...vals, content: e.target.value})} /></FL>
            </div>
          )}
        />
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

const TABS_BASE: Array<{ id: JobSubTab; label: string; icon: any }> = [
  { id: 'overview',  label: 'Overview',  icon: ClipboardList },
  { id: 'quotes',    label: 'Quotes',    icon: FileText      },
  { id: 'invoices',  label: 'Invoices',  icon: Receipt       },
  { id: 'materials', label: 'Materials', icon: Package       },
  { id: 'labour',    label: 'Labour',    icon: Clock         },
  { id: 'events',    label: 'Notes',     icon: MessageSquare },
  { id: 'tasks',     label: 'Tasks',     icon: CheckSquare   },
]

export default function WsJobDetail({ wsId }: { wsId: WorkspaceId }) {
  const params = useParams<{ id: string }>()
  const jobId = params.id
  const ws = getWorkspace(wsId)
  const { user, job, loading } = useWorkspaceJob(wsId, jobId)
  const [tab, setTab] = useState<JobSubTab>('overview')
  const [exporting, setExporting] = useState(false)

  if (user === undefined || loading) return <div className="p-4 text-sm text-zinc-500">Loading job…</div>
  if (!user) return <div className="p-4 text-sm text-red-300">Not signed in.</div>
  if (!job) return (
    <div className="space-y-3 p-4">
      <p className="text-zinc-400">Job not found.</p>
      <Link href={`/${wsId}/jobs`} className="wj-btn-ghost"><ArrowLeft className="h-4 w-4" /> Back to jobs</Link>
    </div>
  )

  const uid = user.uid
  const basePath = `/${wsId}`

  async function handleExport() {
    setExporting(true)
    try {
      const base = `users/${uid}/workspaces/${wsId}/jobs/${jobId}`
      const labourSnap = await getDocs(collection(db, `${base}/labour`))
      const labour = labourSnap.docs.map(d => d.data())
      if (wsId === 'petlet') {
        exportPetLetInvoice(job, labour)
      } else {
        // Generic export for My Business
        const [qS, iS, mS, pS, eS] = await Promise.all([
          getDocs(collection(db, `${base}/quotes`)),
          getDocs(collection(db, `${base}/invoices`)),
          getDocs(collection(db, `${base}/materials`)),
          getDocs(collection(db, `${base}/payments`)),
          getDocs(collection(db, `${base}/events`)),
        ])
        const { exportMyBusinessJobPack } = await import('@/components/workspace/MyBusinessExport')
        exportMyBusinessJobPack(job, qS.docs.map(d=>d.data()), iS.docs.map(d=>d.data()), mS.docs.map(d=>d.data()), labour, pS.docs.map(d=>d.data()), eS.docs.map(d=>d.data()))
      }
    } catch (e) { console.error(e) }
    setExporting(false)
  }

  // Overview tab inline
  const STATUS_OPTIONS: JobStatus[] = ['lead','quoted','approved','in_progress','invoiced','paid','complete','cancelled']
  function OverviewTab() {
    const [saving, setSaving] = useState(false)
    async function changeStatus(status: string) {
      setSaving(true)
      await updateDoc(doc(db, `users/${uid}/workspaces/${wsId}/jobs`, jobId), { status, updatedAt: serverTimestamp() })
      setSaving(false)
    }
    const details = [
      ['Customer', job.customerName], ['Phone', job.customerPhone], ['Email', job.customerEmail],
      ['Site address', job.siteAddress], ['Start date', job.startDate], ['Due date', job.dueDate],
      ['Description', job.jobDescription],
      ...(wsId === 'petlet' ? [
        ['Property code', job.petletProperty],
        ['Work type', job.petletWorkType],
        ['Pre-approved', job.preApproved ? 'Yes' : 'No'],
      ] : []),
    ].filter(([, v]) => v)
    return (
      <div className="space-y-4">
        <div className="wj-card p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Job Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s} disabled={saving || job.status === s} onClick={() => changeStatus(s)}
                className={cn('rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition',
                  job.status === s ? cn(statusColor[s], 'ring-1 ring-white/20') : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20')}>
                {jobStatusLabel[s] ?? s}
              </button>
            ))}
          </div>
        </div>
        {details.length > 0 && (
          <div className="wj-card overflow-hidden">
            <table className="w-full text-sm"><tbody>
              {details.map(([label, value]) => (
                <tr key={label} className="border-t border-white/[0.06] first:border-0">
                  <td className="w-36 py-3 pl-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</td>
                  <td className="py-3 pr-4 text-zinc-200">{String(value ?? '—')}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`${basePath}/jobs`} className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="h-3 w-3" /> {ws.label} Jobs
          </Link>
          <h1 className="text-2xl font-black tracking-tight">{job.jobTitle}</h1>
          <p className="mt-0.5 text-sm text-zinc-400">{job.customerName}{job.siteAddress ? ` · ${job.siteAddress}` : ''}</p>
          {job.petletProperty && <p className="mt-0.5 text-xs font-mono text-cyan-300">Property: {job.petletProperty}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className={cn('wj-badge capitalize', priorityColor[job.priority] ?? '')}>{job.priority ?? 'normal'}</span>
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col sm:items-end">
          <Link href={`${basePath}/jobs/${jobId}/edit`} className="wj-btn-secondary"><Edit className="h-4 w-4" /> Edit</Link>
          <button onClick={handleExport} disabled={exporting} className="wj-btn-ghost border border-white/10">
            <Download className="h-4 w-4" /> {wsId === 'petlet' ? 'PetLet Invoice' : 'Export Pack'}
          </button>
        </div>
      </div>

      <FinancialSummary job={job} />

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-1.5">
        {TABS_BASE.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
              tab === t.id ? 'bg-gradient-to-r from-red-600/80 to-amber-500/60 text-white shadow' : 'text-zinc-400 hover:text-white')}>
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'labour' && wsId === 'petlet' && <PetLetLabourTab jobId={jobId} uid={uid} wsId={wsId} />}
        {tab === 'labour' && wsId !== 'petlet' && <LabourTab jobId={jobId} uid={uid} wsId={wsId} />}
        {tab === 'events' && <NotesTab jobId={jobId} uid={uid} wsId={wsId} />}
        {/* Quotes/Invoices/Materials/Tasks — generic implementations below */}
        {tab === 'quotes' && <GenericSubTab wsId={wsId} jobId={jobId} uid={uid} sub="quotes" label="Quote" addLabel="Add Quote" icon={FileText} renderView={q => <div><div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{q.quoteNumber||'Quote'}</span><span className={cn('wj-badge', statusColor[q.status]??'')}>{q.status}</span><span className="ml-auto font-bold text-amber-300">{formatCurrency(q.total)}</span></div>{q.description && <p className="mt-1 text-sm text-zinc-400">{q.description}</p>}</div>} addFields={[{n:'quoteNumber',l:'Quote #',ph:'Q-0001'},{n:'status',l:'Status',type:'select',opts:['DRAFT','SENT','ACCEPTED','DECLINED']},{n:'total',l:'Total ($)',type:'number'},{n:'description',l:'Description'}]} />}
        {tab === 'invoices' && <GenericSubTab wsId={wsId} jobId={jobId} uid={uid} sub="invoices" label="Invoice" addLabel="Add Invoice" icon={Receipt} renderView={i => <div><div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{i.invoiceNumber||'Invoice'}</span><span className={cn('wj-badge',statusColor[i.status]??'')}>{i.status}</span>{i.invoiceDate && <span className="text-xs text-zinc-500">{i.invoiceDate}</span>}<span className="ml-auto font-bold text-white">{formatCurrency(i.total)}</span></div><div className="mt-1 flex gap-4 text-sm"><span className="text-zinc-400">Paid: <strong className="text-green-300">{formatCurrency(i.amountPaid)}</strong></span>{i.balanceOwing>0 && <span className="text-zinc-400">Owing: <strong className="text-red-300">{formatCurrency(i.balanceOwing)}</strong></span>}</div></div>} addFields={[{n:'invoiceNumber',l:'Invoice #',ph:'INV-0001'},{n:'invoiceDate',l:'Date',type:'date'},{n:'total',l:'Total ($)',type:'number'},{n:'amountPaid',l:'Amount Paid ($)',type:'number'},{n:'status',l:'Status',type:'select',opts:['DRAFT','SENT','PART_PAID','PAID','VOID']},{n:'notes',l:'Notes'}]} />}
        {tab === 'materials' && <GenericSubTab wsId={wsId} jobId={jobId} uid={uid} sub="materials" label="Material" addLabel="Add Material" icon={Package} renderView={m => <div><div className="flex items-center gap-2"><span className="font-semibold">{m.name}</span>{m.supplier && <span className="text-xs text-zinc-500">{m.supplier}</span>}{m.totalCost>0&&<span className="ml-auto font-bold text-amber-300">{formatCurrency(m.totalCost)}</span>}</div><div className="mt-1 flex gap-3 text-xs text-zinc-500">{m.quantity&&<span>Qty: {m.quantity}</span>}{m.unitCost>0&&<span>Unit: {formatCurrency(m.unitCost)}</span>}</div></div>} addFields={[{n:'name',l:'Item *',ph:'Description'},{n:'supplier',l:'Supplier'},{n:'quantity',l:'Qty',type:'number'},{n:'unitCost',l:'Unit cost ($)',type:'number'},{n:'totalCost',l:'Total ($)',type:'number'}]} />}
        {tab === 'tasks' && <TasksTab jobId={jobId} uid={uid} wsId={wsId} />}
      </div>
    </div>
  )
}

// ── Generic sub-collection tab ─────────────────────────────────────────────────

function GenericSubTab({ wsId, jobId, uid, sub, label, addLabel, icon: Icon, renderView, addFields }: {
  wsId: string; jobId: string; uid: string; sub: string; label: string; addLabel: string; icon: any;
  renderView: (item: any) => React.ReactNode;
  addFields: Array<{ n: string; l: string; ph?: string; type?: string; opts?: string[] }>;
}) {
  const { data: items, loading } = useWorkspaceJobSub<any>(wsId, jobId, sub, 'createdAt')
  const [addV, setAddV] = useState<Record<string, any>>({})
  const [addSaving, setAddSaving] = useState(false)

  async function create(close: () => void) {
    setAddSaving(true)
    const payload: Record<string, any> = { ...addV, jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
    if (sub === 'invoices') {
      const total = Number(addV.total || 0)
      const amountPaid = Number(addV.amountPaid || 0)
      payload.balanceOwing = Math.max(0, total - amountPaid)
      if (amountPaid >= total && total > 0) payload.status = 'PAID'
      else if (amountPaid > 0) payload.status = 'PART_PAID'
    }
    if (sub === 'materials') {
      payload.totalCost = Number(addV.totalCost || 0) || Number(addV.quantity || 1) * Number(addV.unitCost || 0)
    }
    await addDoc(collection(db, wsJobSubPath(uid, wsId, jobId, sub)), payload)
    recalcTotals(uid, wsId, jobId).catch(console.error)
    setAddV({}); setAddSaving(false); close()
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${label.toLowerCase()}?`)) return
    await deleteDoc(doc(db, wsJobSubPath(uid, wsId, jobId, sub), id))
    recalcTotals(uid, wsId, jobId).catch(console.error)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AddPanel label={addLabel} icon={Icon}>
          {close => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {addFields.map(f => (
                  <FL key={f.n} label={f.l}>
                    {f.type === 'select' ? (
                      <select className="wj-input" value={addV[f.n] ?? ''} onChange={e => setAddV(p => ({...p, [f.n]: e.target.value}))}>
                        {(f.opts || []).map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="wj-input" type={f.type || 'text'} placeholder={f.ph} value={addV[f.n] ?? ''} onChange={e => setAddV(p => ({...p, [f.n]: e.target.value}))} />
                    )}
                  </FL>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="wj-btn-primary" disabled={addSaving} onClick={() => create(close)}>{addSaving ? 'Saving…' : `Save ${label}`}</button>
                <button className="wj-btn-ghost" onClick={close}>Cancel</button>
              </div>
            </div>
          )}
        </AddPanel>
      </div>
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {!loading && items.length === 0 && <div className="wj-card p-6 text-center text-sm text-zinc-500">No {label.toLowerCase()}s yet.</div>}
      {items.map(item => (
        <div key={item.id} className="wj-card p-4 group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">{renderView(item)}</div>
            <button onClick={() => remove(item.id)} className="wj-btn-ghost shrink-0 p-2 opacity-60 group-hover:opacity-100 text-zinc-500 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tasks tab ──────────────────────────────────────────────────────────────────

function TasksTab({ jobId, uid, wsId }: { jobId: string; uid: string; wsId: string }) {
  const { data: items, loading } = useWorkspaceJobSub<any>(wsId, jobId, 'tasks', 'createdAt')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    await addDoc(collection(db, wsJobSubPath(uid, wsId, jobId, 'tasks')), { title, done: false, jobId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    setTitle(''); setSaving(false)
  }

  async function toggle(item: any) {
    await updateDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'tasks'), item.id), { done: !item.done, updatedAt: serverTimestamp() })
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, wsJobSubPath(uid, wsId, jobId, 'tasks'), id))
  }

  return (
    <div className="space-y-3">
      <div className="wj-card flex gap-2 p-3">
        <input className="wj-input" placeholder="New task…" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
        <button className="wj-btn-primary shrink-0" onClick={create} disabled={saving || !title.trim()}><Plus className="h-4 w-4" /></button>
      </div>
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
      {items.map(item => (
        <div key={item.id} className="wj-card flex items-center gap-3 p-4 group">
          <button onClick={() => toggle(item)} className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border transition', item.done ? 'border-green-400 bg-green-400/20' : 'border-zinc-600 hover:border-amber-400')}>
            {item.done && <span className="text-xs text-green-300 leading-none">✓</span>}
          </button>
          <p className={cn('flex-1 text-sm', item.done && 'text-zinc-500 line-through')}>{item.title}</p>
          <button onClick={() => remove(item.id)} className="wj-btn-ghost shrink-0 p-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  )
}
