'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, doc, deleteDoc, getDoc, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { ArrowLeft, Save, Plus, Trash2, Search, CheckCircle2, FileDown, Mail, LayoutList, List } from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { wsCollectionPath } from '@/lib/workspaces'
import { nextNumber, peekNextNumber } from '@/lib/counters'
import { findJobByNumber, listJobs, type JobSummary } from '@/lib/jobLookup'
import { formatCurrency } from '@/lib/finance'
import { buildProfessionalDocumentHtml } from '@/lib/docTemplates'
import { cn } from '@/lib/utils'

interface LineItem { id: string; description: string; qty: number; unitPrice: number; lineType: 'labour'|'material'|'travel'|'other'; total: number }

function makeLineId() {
  const c = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
function newLine(): LineItem { return { id: makeLineId(), description: '', qty: 1, unitPrice: 0, lineType: 'labour', total: 0 } }
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn('space-y-1', wide && 'sm:col-span-2')}><label className="wj-field-label">{label}</label>{children}</div>
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-3">
    <button type="button" onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors', checked ? 'bg-blue-500' : 'bg-zinc-700')}>
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition duration-200', checked ? 'translate-x-5' : 'translate-x-0')} />
    </button>
    <span className="text-sm text-zinc-200">{label}</span>
  </label>
}

export default function InvoiceForm({ wsId, id, prefillJobId }: { wsId: string; id?: string; prefillJobId?: string }) {
  const router = useRouter()
  const user = useFirebaseUser()
  const today = new Date().toISOString().slice(0, 10)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [numberPreview, setNumberPreview] = useState('')
  const [numLoading, setNumLoading] = useState(!id)
  const [status, setStatus] = useState<'DRAFT'|'SENT'|'PART_PAID'|'PAID'|'VOID'>('DRAFT')
  const [invoiceDate, setInvoiceDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [linkedJobNumber, setLinkedJobNumber] = useState('')
  const [linkedJobId, setLinkedJobId] = useState('')
  const [linkedQuoteNumber, setLinkedQuoteNumber] = useState('')
  const [jobLookup, setJobLookup] = useState<'idle'|'searching'|'found'|'notfound'>('idle')
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [showJobPicker, setShowJobPicker] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [clientView, setClientView] = useState(true)
  const [gstEnabled, setGstEnabled] = useState(wsId !== 'petlet')
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentDetails, setPaymentDetails] = useState('Payment is due within 7 days of invoice date. Please pay via bank transfer.')
  const [notes, setNotes] = useState('')
  const [docLoading, setDocLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const subtotal = lines.reduce((a, l) => a + l.total, 0)
  const gstAmount = gstEnabled ? subtotal * 0.1 : 0
  const total = subtotal + gstAmount
  const balance = Math.max(0, total - amountPaid)

  useEffect(() => {
    if (user === undefined) return
    if (!user) { setDocLoading(false); setNumLoading(false); return }
    listJobs(user.uid, wsId).then(setJobs)
    if (id) {
      setDocLoading(true)
      getDoc(doc(db, userCollectionPath(user.uid, 'invoices'), id)).then(snap => {
        if (!snap.exists()) return
        const d = snap.data()
        setInvoiceNumber(d.invoiceNumber || ''); setStatus(d.status || 'DRAFT')
        setInvoiceDate(d.invoiceDate || today); setDueDate(d.dueDate || '')
        setLinkedJobId(d.linkedJobId || ''); setLinkedJobNumber(d.linkedJobNumber || '')
        setLinkedQuoteNumber(d.linkedQuoteNumber || '')
        setClientName(d.clientName || d.customerName || ''); setClientPhone(d.clientPhone || d.customerPhone || '')
        setClientEmail(d.clientEmail || d.customerEmail || ''); setSiteAddress(d.siteAddress || '')
        setLines(d.lines?.length ? d.lines : [newLine()])
        setGstEnabled(d.gstEnabled ?? wsId !== 'petlet'); setAmountPaid(d.amountPaid || 0)
        setPaymentMethod(d.paymentMethod || 'Bank Transfer'); setPaymentRef(d.paymentRef || '')
        setPaymentDetails(String(d.paymentDetails || 'Payment is due within 7 days of invoice date. Please pay via bank transfer.').replace(/\n?Min 2 hour callout fee\.?/gi, ''))
        setNotes(d.notes || '')
      }).finally(() => setDocLoading(false))
    } else {
      peekNextNumber(user.uid, wsId, 'invoice').then(n => { setInvoiceNumber(n); setNumberPreview(n) }).finally(() => setNumLoading(false))
    }
  }, [user, id, wsId, today])

  useEffect(() => {
    if (!user || !prefillJobId || id) return
    getDoc(doc(db, wsCollectionPath(user.uid, wsId, 'jobs'), prefillJobId)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setLinkedJobId(snap.id); setLinkedJobNumber(d.jobNumber || '')
      setClientName(d.customerName || ''); setClientPhone(d.customerPhone || '')
      setClientEmail(d.customerEmail || ''); setSiteAddress(d.siteAddress || '')
      setJobLookup('found')
    })
  }, [user, prefillJobId, wsId, id])

  async function lookupJob() {
    if (!user || !linkedJobNumber.trim()) return
    setJobLookup('searching')
    const job = await findJobByNumber(user.uid, wsId, linkedJobNumber)
    if (job) {
      setLinkedJobId(job.id); setClientName(job.customerName || ''); setClientPhone(job.customerPhone || '')
      setClientEmail(job.customerEmail || ''); setSiteAddress(job.siteAddress || ''); setJobLookup('found')
    } else { setJobLookup('notfound') }
  }

  function pickJob(job: JobSummary) {
    setLinkedJobId(job.id); setLinkedJobNumber(job.jobNumber || '')
    setClientName(job.customerName || ''); setClientPhone(job.customerPhone || '')
    setClientEmail(job.customerEmail || ''); setSiteAddress(job.siteAddress || '')
    setJobLookup('found'); setShowJobPicker(false)
  }

  function updateLine(lid: string, field: keyof LineItem, value: any) {
    setLines(prev => prev.map(l => {
      if (l.id !== lid) return l
      const next = { ...l, [field]: value }
      next.total = Number(next.qty || 0) * Number(next.unitPrice || 0)
      return next
    }))
  }

  async function save() {
    if (!user) { setError('Not signed in.'); return }
    setSaving(true); setSaved(false); setError('')
    try {
      const docRef = id
        ? doc(db, userCollectionPath(user.uid, 'invoices'), id)
        : doc(collection(db, userCollectionPath(user.uid, 'invoices')))
      const typedNumber = invoiceNumber.trim()
      const finalNumber = id
        ? typedNumber
        : (!typedNumber || typedNumber.toLowerCase().includes('generating') || typedNumber === numberPreview)
          ? await nextNumber(user.uid, wsId, 'invoice')
          : typedNumber
      setInvoiceNumber(finalNumber)
      const cleanLines = lines.map(l => ({ ...l, qty: Number(l.qty || 0), unitPrice: Number(l.unitPrice || 0), total: Number(l.qty || 0) * Number(l.unitPrice || 0) }))
      const finalSubtotal = cleanLines.reduce((a, l) => a + Number(l.total || 0), 0)
      const finalGst = gstEnabled ? finalSubtotal * 0.1 : 0
      const finalTotal = finalSubtotal + finalGst
      const paidStatus = amountPaid <= 0 ? (status === 'DRAFT' ? 'DRAFT' : 'SENT') : amountPaid >= finalTotal ? 'PAID' : 'PART_PAID'
      const payload = {
        invoiceNumber: finalNumber, workspaceId: wsId, status: paidStatus,
        invoiceDate, dueDate, linkedJobId, linkedJobNumber, linkedQuoteNumber,
        clientName, clientPhone, clientEmail, siteAddress,
        customerName: clientName, customerPhone: clientPhone, customerEmail: clientEmail,
        lines: cleanLines, gstEnabled, subtotal: finalSubtotal, gstAmount: finalGst, total: finalTotal,
        amountPaid, balanceOwing: Math.max(0, finalTotal - amountPaid), paymentMethod, paymentRef,
        paymentDetails: paymentDetails.replace(/\n?Min 2 hour callout fee\.?/gi, ''), notes,
        updatedAt: serverTimestamp(),
        ...(id ? {} : { createdAt: serverTimestamp() }),
      }
      await setDoc(docRef, payload, { merge: true })
      await Promise.all([
        setDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'invoices', docRef.id), payload, { merge: true }),
        linkedJobId
          ? setDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'jobs', linkedJobId, 'invoices', docRef.id), { ...payload, invoiceId: docRef.id }, { merge: true })
          : Promise.resolve(),
        linkedJobId
          ? setDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'jobs', linkedJobId), { totalInvoiced: finalTotal, totalPaid: amountPaid, balanceDue: Math.max(0, finalTotal - amountPaid), status: paidStatus === 'PAID' ? 'paid' : 'invoiced', updatedAt: serverTimestamp() }, { merge: true })
          : Promise.resolve(),
      ])
      const check = await getDoc(docRef)
      if (!check.exists()) throw new Error('Invoice did not save online. Please check your internet/Firebase connection.')
      setSaved(true)
      router.replace('/invoices')
      router.refresh()
    } catch (err: any) { setError(err.message || 'Could not save invoice online.'); setSaving(false) }
  }

  async function deleteInvoice() {
    if (!user || !id) return
    if (!confirm(`Delete invoice ${invoiceNumber || id}? This cannot be undone.`)) return
    setSaving(true); setError('')
    try {
      await Promise.all([
        deleteDoc(doc(db, userCollectionPath(user.uid, 'invoices'), id)),
        deleteDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'invoices', id)).catch(() => undefined),
        linkedJobId ? deleteDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'jobs', linkedJobId, 'invoices', id)).catch(() => undefined) : Promise.resolve(),
      ])
      router.replace('/invoices')
      router.refresh()
    } catch (err: any) { setError(err.message || 'Could not delete invoice.'); setSaving(false) }
  }

  function exportPrint() {
    const html = buildProfessionalDocumentHtml({
      kind: 'Tax Invoice', number: invoiceNumber || numberPreview, status, date: invoiceDate, dueDate,
      linkedJobNumber, clientName, clientPhone, clientEmail, siteAddress,
      lines, gstEnabled, subtotal, gstAmount, total, amountPaid, balanceOwing: balance,
      paymentDetails, notes, workspaceId: wsId, clientView,
    })
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
  }

  if (user === undefined || docLoading) return <div className="p-6 text-sm text-zinc-500">Loading…</div>
  if (!user) return <div className="p-6 text-sm text-red-300">Not signed in.</div>

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <div className="wj-appbar">
        <button onClick={() => router.back()} className="wj-appbar-btn p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <span className="wj-appbar-title">{id ? 'Edit Invoice' : 'New Invoice'}</span>
        <button onClick={save} disabled={saving} className="wj-appbar-btn bg-white/15 font-bold">
          <Save className="h-4 w-4" />{saving ? 'Saving…' : saved ? '✓' : 'Save'}
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4 pb-36">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <div className="wj-section">
          <p className="wj-section-title">Invoice Reference</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Invoice Number"><input className="wj-field font-mono" value={numLoading ? 'Generating…' : invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} disabled={numLoading} /></Field>
            <Field label="Status"><select className="wj-field" value={status} onChange={e => setStatus(e.target.value as any)}>{['DRAFT','SENT','PART_PAID','PAID','VOID'].map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Invoice Date"><input className="wj-field" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></Field>
            <Field label="Due Date"><input className="wj-field" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
          </div>
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Linked Job / Quote</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="wj-field-label">Job Number</label>
              <div className="flex gap-2">
                <input className={cn('wj-field', jobLookup === 'found' && 'border-green-400/40')} placeholder="e.g. J-1001" value={linkedJobNumber}
                  onChange={e => { setLinkedJobNumber(e.target.value); setJobLookup('idle') }} onBlur={lookupJob} />
                <button type="button" onClick={lookupJob} className="wj-btn-secondary px-3"><Search className="h-4 w-4" /></button>
                <button type="button" onClick={() => setShowJobPicker(!showJobPicker)} className="wj-btn-secondary px-3 text-xs">Pick</button>
              </div>
              {jobLookup === 'found' && <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Filled from job</p>}
              {jobLookup === 'notfound' && <p className="text-xs text-red-400">Job not found.</p>}
              {showJobPicker && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900">
                  {jobs.map(j => <button key={j.id} type="button" onClick={() => pickJob(j)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-white/5"><span className="font-mono text-xs text-amber-300">{j.jobNumber || '—'}</span><span className="flex-1 text-sm">{j.jobTitle || j.customerName || '—'}</span></button>)}
                </div>
              )}
            </div>
            <Field label="Quote Number (optional)"><input className="wj-field" placeholder="e.g. Q-1001" value={linkedQuoteNumber} onChange={e => setLinkedQuoteNumber(e.target.value)} /></Field>
          </div>
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Bill To</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client Name" wide><input className="wj-field" value={clientName} onChange={e => setClientName(e.target.value)} /></Field>
            <Field label="Phone"><input className="wj-field" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></Field>
            <Field label="Email"><input className="wj-field" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></Field>
            <Field label="Site Address" wide><input className="wj-field" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} /></Field>
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
          <button onClick={() => setClientView(true)} className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition', clientView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white')}><List className="h-3.5 w-3.5" /> Client View</button>
          <button onClick={() => setClientView(false)} className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition', !clientView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white')}><LayoutList className="h-3.5 w-3.5" /> Detailed View</button>
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Line Items</p>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={line.id} className="wj-line-item space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500">#{i+1}</span>
                  {!clientView && <select className="rounded-lg border border-white/10 bg-zinc-800 px-2 py-1 text-xs" value={line.lineType} onChange={e => updateLine(line.id, 'lineType', e.target.value)}><option value="labour">Labour</option><option value="material">Material</option><option value="travel">Travel</option><option value="other">Other</option></select>}
                  <button onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))} className="ml-auto text-zinc-600 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <input className="wj-field" placeholder="Description" value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><label className="wj-field-label">Qty</label><input className="wj-field text-center" type="number" step="0.25" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} /></div>
                  <div className="space-y-1"><label className="wj-field-label">Unit ($)</label><input className="wj-field text-right" type="number" step="0.01" value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', Number(e.target.value))} /></div>
                  <div className="space-y-1"><label className="wj-field-label">Total</label><div className="wj-field bg-zinc-800/50 text-right font-bold text-amber-300">{formatCurrency(line.total)}</div></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setLines(prev => [...prev, newLine()])} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm text-zinc-400 hover:border-blue-400/40 hover:text-blue-300 transition"><Plus className="h-4 w-4" /> Add Line Item</button>
          </div>
        </div>

        <div className="wj-gst-section">
          <p className="wj-gst-title">GST</p>
          <Toggle checked={gstEnabled} onChange={setGstEnabled} label={gstEnabled ? 'GST applies (10%)' : 'No GST applies'} />
        </div>

        <div className="wj-total-card space-y-2">
          <p className="wj-section-title text-zinc-400">Totals</p>
          <div className="flex justify-between text-sm text-zinc-300"><span>Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm text-zinc-400"><span>GST</span><span>{gstEnabled ? formatCurrency(gstAmount) : 'No GST'}</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-black"><span>TOTAL</span><span className="text-amber-300">{formatCurrency(total)}</span></div>
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Payment Received</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount Paid ($)"><input className="wj-field text-right text-lg font-bold" type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} /></Field>
            <Field label="Payment Method"><select className="wj-field" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>{['Bank Transfer','Cash','Card','Cheque','Other'].map(m => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Reference" wide><input className="wj-field" placeholder="Receipt or reference number" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} /></Field>
          </div>
          <div className={cn('mt-4 rounded-xl p-4 text-center', balance === 0 ? 'border border-green-400/30 bg-green-950/40' : 'border border-amber-400/30 bg-amber-950/30')}>
            {balance === 0 ? <p className="text-lg font-black text-green-300">✓ Paid in Full</p> : <div><p className="text-xs text-zinc-400">Balance Due</p><p className="text-3xl font-black text-amber-300">{formatCurrency(balance)}</p></div>}
          </div>
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Payment Details (shown on invoice)</p>
          <textarea className="wj-field min-h-[80px] font-mono text-xs" value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} />
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Notes</p>
          <textarea className="wj-field min-h-[60px]" placeholder="Any notes for this invoice…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="wj-action-bar flex-col gap-2 sm:flex-row">
        <button onClick={save} disabled={saving} className="wj-btn-primary flex-1"><Save className="h-4 w-4" />{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Invoice'}</button>
        {id && (
          <button onClick={deleteInvoice} disabled={saving} className="wj-btn-secondary flex-1 border-red-500/40 text-red-200 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" /> Delete Invoice
          </button>
        )}
        <button onClick={exportPrint} className="wj-btn-secondary flex-1"><FileDown className="h-4 w-4" /> Print / Save PDF</button>
        <a href={`mailto:${clientEmail}?subject=Invoice ${invoiceNumber}&body=Please find invoice ${invoiceNumber} — ${formatCurrency(total)}`} className="wj-btn-secondary flex flex-1 items-center justify-center gap-2"><Mail className="h-4 w-4" /> Email Invoice PDF</a>
      </div>
    </div>
  )
}
