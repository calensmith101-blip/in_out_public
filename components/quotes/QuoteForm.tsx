'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, doc, deleteDoc,
  getDoc, serverTimestamp, setDoc,
} from 'firebase/firestore'
import {
  ArrowLeft, Plus, Save, Trash2, Search, CheckCircle2,
  FileDown, Mail, LayoutList, List,
} from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { wsCollectionPath } from '@/lib/workspaces'
import { nextNumber, peekNextNumber } from '@/lib/counters'
import { findJobByNumber, listJobs, type JobSummary } from '@/lib/jobLookup'
import { formatCurrency } from '@/lib/finance'
import { buildProfessionalDocumentHtml } from '@/lib/docTemplates'
import { cn } from '@/lib/utils'

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED'

interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  lineType: 'labour' | 'material' | 'other'
  total: number
}

function makeLineId() {
  const c = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
function newLine(): LineItem {
  return { id: makeLineId(), description: '', qty: 1, unitPrice: 0, lineType: 'labour', total: 0 }
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('space-y-1', wide && 'sm:col-span-2')}>
      <label className="wj-field-label">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-checked={checked}
        onClick={() => onChange(!checked)}
        className="wj-toggle"
      >
        <span className="wj-toggle-thumb" style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
      </button>
      <span className="text-sm text-zinc-200">{label}</span>
    </label>
  )
}

export default function QuoteForm({
  wsId,
  id,
  prefillJobId,
}: {
  wsId: string
  id?: string
  prefillJobId?: string
}) {
  const router = useRouter()
  const user = useFirebaseUser()
  const today = new Date().toISOString().slice(0, 10)

  const [quoteNumber, setQuoteNumber] = useState('')
  const [numberPreview, setNumberPreview] = useState('')
  const [numLoading, setNumLoading] = useState(!id)
  const [status, setStatus] = useState<QuoteStatus>('DRAFT')
  const [linkedJobNumber, setLinkedJobNumber] = useState('')
  const [linkedJobId, setLinkedJobId] = useState('')
  const [linkedJobLookup, setLinkedJobLookup] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle')
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [showJobPicker, setShowJobPicker] = useState(false)

  // Client details
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [siteAddress, setSiteAddress] = useState('')

  // Quote content
  const [scopeOfWorks, setScopeOfWorks] = useState('')
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [gstEnabled, setGstEnabled] = useState(wsId !== 'petlet')
  const [terms, setTerms] = useState('Payment is due within 7 days of invoice date. Please pay via bank transfer.')
  const [disclaimer, setDisclaimer] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [quoteDate, setQuoteDate] = useState(today)
  const [clientView, setClientView] = useState(true)
  const [validUntil, setValidUntil] = useState('')

  const [docLoading, setDocLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Totals
  const subtotal = lines.reduce((a, l) => a + l.total, 0)
  const gstAmount = gstEnabled ? subtotal * 0.1 : 0
  const total = subtotal + gstAmount

  // Load number + existing doc
  useEffect(() => {
    if (user === undefined) return
    if (!user) { setDocLoading(false); setNumLoading(false); return }

    // Load job picker list
    listJobs(user.uid, wsId).then(setJobs)

    if (id) {
      setDocLoading(true)
      getDoc(doc(db, userCollectionPath(user.uid, 'quotes'), id))
        .then(snap => {
          if (!snap.exists()) return
          const d = snap.data()
          setQuoteNumber(d.quoteNumber || '')
          setStatus(d.status || 'DRAFT')
          setLinkedJobId(d.linkedJobId || '')
          setLinkedJobNumber(d.linkedJobNumber || '')
          setClientName(d.clientName || d.customerName || '')
          setClientPhone(d.clientPhone || d.customerPhone || '')
          setClientEmail(d.clientEmail || d.customerEmail || '')
          setSiteAddress(d.siteAddress || '')
          setScopeOfWorks(d.scopeOfWorks || '')
          setLines(d.lines?.length ? d.lines : [newLine()])
          setGstEnabled(d.gstEnabled ?? wsId !== 'petlet')
          setTerms(String(d.terms || 'Payment is due within 7 days of invoice date. Please pay via bank transfer.').replace(/\n?Min 2 hour callout fee\.?/gi, ''))
          setDisclaimer(d.disclaimer || '')
          setAdditionalNotes(d.additionalNotes || '')
          setQuoteDate(d.quoteDate || today)
          setValidUntil(d.validUntil || '')
        })
        .finally(() => setDocLoading(false))
    } else {
      peekNextNumber(user.uid, wsId, 'quote')
        .then(n => { setQuoteNumber(n); setNumberPreview(n) })
        .finally(() => setNumLoading(false))
    }
  }, [user, id, wsId, today])

  // Prefill from job if provided
  useEffect(() => {
    if (!user || !prefillJobId || id) return
    getDoc(doc(db, wsCollectionPath(user.uid, wsId, 'jobs'), prefillJobId)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setLinkedJobId(snap.id)
      setLinkedJobNumber(d.jobNumber || '')
      setClientName(d.customerName || '')
      setClientPhone(d.customerPhone || '')
      setClientEmail(d.customerEmail || '')
      setSiteAddress(d.siteAddress || '')
      setScopeOfWorks(d.jobDescription || '')
      setLinkedJobLookup('found')
    })
  }, [user, prefillJobId, wsId, id])

  // Job number autofill
  async function lookupJob() {
    if (!user || !linkedJobNumber.trim()) return
    setLinkedJobLookup('searching')
    const job = await findJobByNumber(user.uid, wsId, linkedJobNumber)
    if (job) {
      setLinkedJobId(job.id)
      setClientName(job.customerName || '')
      setClientPhone(job.customerPhone || '')
      setClientEmail(job.customerEmail || '')
      setSiteAddress(job.siteAddress || '')
      if (!scopeOfWorks) setScopeOfWorks(job.jobDescription || '')
      setLinkedJobLookup('found')
    } else {
      setLinkedJobLookup('notfound')
    }
  }

  function pickJob(job: JobSummary) {
    setLinkedJobId(job.id)
    setLinkedJobNumber(job.jobNumber || '')
    setClientName(job.customerName || '')
    setClientPhone(job.customerPhone || '')
    setClientEmail(job.customerEmail || '')
    setSiteAddress(job.siteAddress || '')
    if (!scopeOfWorks) setScopeOfWorks(job.jobDescription || '')
    setLinkedJobLookup('found')
    setShowJobPicker(false)
  }

  // Line item helpers
  function updateLine(id: string, field: keyof LineItem, value: any) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const next = { ...l, [field]: value }
      next.total = Number(next.qty || 0) * Number(next.unitPrice || 0)
      return next
    }))
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  async function save() {
    if (!user) { setError('Not signed in.'); return }
    setSaving(true); setSaved(false); setError('')
    try {
      const docRef = id
        ? doc(db, userCollectionPath(user.uid, 'quotes'), id)
        : doc(collection(db, userCollectionPath(user.uid, 'quotes')))
      const typedNumber = quoteNumber.trim()
      const finalNumber = id
        ? typedNumber
        : (!typedNumber || typedNumber.toLowerCase().includes('generating') || typedNumber === numberPreview)
          ? await nextNumber(user.uid, wsId, 'quote')
          : typedNumber
      setQuoteNumber(finalNumber)
      const cleanLines = lines.map(l => ({ ...l, qty: Number(l.qty || 0), unitPrice: Number(l.unitPrice || 0), total: Number(l.qty || 0) * Number(l.unitPrice || 0) }))
      const finalSubtotal = cleanLines.reduce((a, l) => a + Number(l.total || 0), 0)
      const finalGst = gstEnabled ? finalSubtotal * 0.1 : 0
      const payload = {
        quoteNumber: finalNumber,
        workspaceId: wsId,
        status,
        linkedJobId,
        linkedJobNumber,
        clientName, clientPhone, clientEmail, siteAddress,
        customerName: clientName, customerPhone: clientPhone, customerEmail: clientEmail,
        scopeOfWorks, lines: cleanLines,
        gstEnabled, subtotal: finalSubtotal, gstAmount: finalGst, total: finalSubtotal + finalGst,
        terms: terms.replace(/\n?Min 2 hour callout fee\.?/gi, ''), disclaimer, additionalNotes,
        quoteDate, validUntil,
        updatedAt: serverTimestamp(),
        ...(id ? {} : { createdAt: serverTimestamp() }),
      }

      await setDoc(docRef, payload, { merge: true })
      await Promise.all([
        setDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'quotes', docRef.id), payload, { merge: true }),
        linkedJobId
          ? setDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'jobs', linkedJobId, 'quotes', docRef.id), { ...payload, quoteId: docRef.id }, { merge: true })
          : Promise.resolve(),
        linkedJobId
          ? setDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'jobs', linkedJobId), { totalQuoted: finalSubtotal + finalGst, status: status === 'ACCEPTED' ? 'approved' : 'quoted', updatedAt: serverTimestamp() }, { merge: true })
          : Promise.resolve(),
      ])
      const check = await getDoc(docRef)
      if (!check.exists()) throw new Error('Quote did not save online. Please check your internet/Firebase connection.')
      setSaved(true)
      router.replace('/quotes')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Could not save quote online.'); setSaving(false)
    }
  }

  async function deleteQuote() {
    if (!user || !id) return
    if (!confirm(`Delete quote ${quoteNumber || id}? This cannot be undone.`)) return
    setSaving(true); setError('')
    try {
      await Promise.all([
        deleteDoc(doc(db, userCollectionPath(user.uid, 'quotes'), id)),
        deleteDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'quotes', id)).catch(() => undefined),
        linkedJobId ? deleteDoc(doc(db, 'users', user.uid, 'workspaces', wsId, 'jobs', linkedJobId, 'quotes', id)).catch(() => undefined) : Promise.resolve(),
      ])
      router.replace('/quotes')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Could not delete quote.'); setSaving(false)
    }
  }

  function exportPrint() {
    const html = buildProfessionalDocumentHtml({
      kind: 'Quote', number: quoteNumber || numberPreview, status, date: quoteDate, validUntil,
      linkedJobNumber, clientName, clientPhone, clientEmail, siteAddress,
      scopeOfWorks, lines, gstEnabled, subtotal, gstAmount, total,
      terms, disclaimer, notes: additionalNotes, workspaceId: wsId, clientView,
    })
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
  }

  if (user === undefined || docLoading) return <div className="p-6 text-sm text-zinc-500">Loading…</div>
  if (!user) return <div className="p-6 text-sm text-red-300">Not signed in.</div>

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* App bar */}
      <div className="wj-appbar">
        <button onClick={() => router.back()} className="wj-appbar-btn p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <span className="wj-appbar-title">{id ? 'Edit Quote' : 'New Quote'}</span>
        <button onClick={save} disabled={saving} className="wj-appbar-btn bg-white/15 font-bold">
          <Save className="h-4 w-4" />{saving ? 'Saving…' : saved ? '✓' : 'Save'}
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4 pb-36">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {/* Reference */}
        <div className="wj-section">
          <p className="wj-section-title">Quote Reference</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quote Number">
              <input className="wj-field font-mono" value={numLoading ? 'Generating…' : quoteNumber} onChange={e => setQuoteNumber(e.target.value)} disabled={numLoading} />
            </Field>
            <Field label="Status">
              <select className="wj-field" value={status} onChange={e => setStatus(e.target.value as QuoteStatus)}>
                {['DRAFT','SENT','ACCEPTED','DECLINED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Quote Date">
              <input className="wj-field" type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
            </Field>
            <Field label="Valid Until">
              <input className="wj-field" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Linked Job */}
        <div className="wj-section">
          <p className="wj-section-title">Linked Job</p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="wj-field-label">Job Number</label>
              <input
                className={cn('wj-field', linkedJobLookup === 'found' && 'border-green-400/40 focus:border-green-400/60')}
                placeholder="e.g. J-1001 — auto-fills client details"
                value={linkedJobNumber}
                onChange={e => { setLinkedJobNumber(e.target.value); setLinkedJobLookup('idle') }}
                onBlur={lookupJob}
                onKeyDown={e => e.key === 'Enter' && lookupJob()}
              />
            </div>
            <button type="button" onClick={lookupJob} className="mt-6 wj-btn-secondary px-3 py-3">
              <Search className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setShowJobPicker(!showJobPicker)} className="mt-6 wj-btn-secondary px-3 py-3 text-xs">
              Pick
            </button>
          </div>

          {linkedJobLookup === 'searching' && <p className="mt-1 text-xs text-zinc-400">Searching…</p>}
          {linkedJobLookup === 'found' && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-3 w-3" /> Job found — client details filled</p>
          )}
          {linkedJobLookup === 'notfound' && (
            <p className="mt-1 text-xs text-red-400">Job not found in {wsId}. Check the number and try again.</p>
          )}

          {showJobPicker && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900">
              {jobs.length === 0 && <p className="p-3 text-xs text-zinc-500">No jobs yet.</p>}
              {jobs.map(j => (
                <button key={j.id} type="button" onClick={() => pickJob(j)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-white/5">
                  <span className="font-mono text-xs text-amber-300">{j.jobNumber || '—'}</span>
                  <span className="flex-1 text-sm">{j.jobTitle || j.customerName || '—'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client Details */}
        <div className="wj-section">
          <p className="wj-section-title">Client / Bill To</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client Name" wide>
              <input className="wj-field" placeholder="Full name or company" value={clientName} onChange={e => setClientName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="wj-field" type="tel" placeholder="04xx xxx xxx" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
            </Field>
            <Field label="Email">
              <input className="wj-field" type="email" placeholder="client@email.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </Field>
            <Field label="Site Address" wide>
              <input className="wj-field" placeholder="Property or site address" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Scope */}
        <div className="wj-section">
          <p className="wj-section-title">Scope of Works</p>
          <textarea
            className="wj-field min-h-[80px]"
            placeholder="Describe the work to be carried out…"
            value={scopeOfWorks}
            onChange={e => setScopeOfWorks(e.target.value)}
          />
        </div>

        <div className="flex gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
          <button type="button" onClick={() => setClientView(true)} className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition', clientView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white')}><List className="h-3.5 w-3.5" /> Client View</button>
          <button type="button" onClick={() => setClientView(false)} className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition', !clientView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white')}><LayoutList className="h-3.5 w-3.5" /> Detailed View</button>
        </div>

        {/* Line Items */}
        <div className="wj-section">
          <p className="wj-section-title">Line Items</p>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={line.id} className="wj-line-item space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500">#{i + 1}</span>
                  <select
                    className="rounded-lg border border-white/10 bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                    value={line.lineType}
                    onChange={e => updateLine(line.id, 'lineType', e.target.value)}
                  >
                    <option value="labour">Labour</option>
                    <option value="material">Material</option>
                    <option value="other">Other</option>
                  </select>
                  <button onClick={() => removeLine(line.id)} className="ml-auto text-zinc-600 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  className="wj-field"
                  placeholder="Description"
                  value={line.description}
                  onChange={e => updateLine(line.id, 'description', e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="wj-field-label">Qty</label>
                    <input className="wj-field text-center" type="number" step="0.25" min="0" value={line.qty}
                      onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="wj-field-label">Unit ($)</label>
                    <input className="wj-field text-right" type="number" step="0.01" min="0" value={line.unitPrice}
                      onChange={e => updateLine(line.id, 'unitPrice', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="wj-field-label">Total</label>
                    <div className="wj-field bg-zinc-800/50 text-right font-bold text-amber-300">
                      {formatCurrency(line.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setLines(prev => [...prev, { ...newLine(), lineType: 'labour', description: 'Labour' }])} className="wj-btn-secondary justify-center text-xs">+ Labour</button>
              <button type="button" onClick={() => setLines(prev => [...prev, { ...newLine(), lineType: 'material', description: 'Materials / parts' }])} className="wj-btn-secondary justify-center text-xs">+ Materials</button>
              <button type="button" onClick={() => setLines(prev => [...prev, { ...newLine(), lineType: 'other', description: 'Other' }])} className="wj-btn-secondary justify-center text-xs">+ Other</button>
            </div>
            <button
              type="button"
              onClick={() => setLines(prev => [...prev, newLine()])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm text-zinc-400 hover:border-blue-400/40 hover:text-blue-300 transition"
            >
              <Plus className="h-4 w-4" /> Add Line Item
            </button>
          </div>
        </div>

        {/* GST Toggle */}
        <div className="wj-gst-section">
          <p className="wj-gst-title">GST</p>
          <div className="flex items-center justify-between">
            <Toggle checked={gstEnabled} onChange={setGstEnabled} label={gstEnabled ? 'GST applies (10%)' : 'No GST'} />
            {wsId === 'petlet' && <span className="text-xs text-orange-400">PetLet — No GST by default</span>}
          </div>
        </div>

        {/* Totals */}
        <div className="wj-total-card space-y-2">
          <p className="wj-section-title text-zinc-400">Totals</p>
          <div className="flex justify-between text-sm text-zinc-300">
            <span>Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          {gstEnabled && (
            <div className="flex justify-between text-sm text-zinc-400">
              <span>GST (10%)</span><span>{formatCurrency(gstAmount)}</span>
            </div>
          )}
          {!gstEnabled && (
            <div className="flex justify-between text-sm text-zinc-500">
              <span>GST</span><span>No GST applies</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-black">
            <span>TOTAL</span><span className="text-amber-300">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Terms */}
        <div className="wj-section">
          <p className="wj-section-title">Terms & Conditions</p>
          <textarea className="wj-field min-h-[60px]" value={terms} onChange={e => setTerms(e.target.value)} />
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Disclaimer</p>
          <textarea className="wj-field min-h-[60px]" placeholder="Optional disclaimer…" value={disclaimer} onChange={e => setDisclaimer(e.target.value)} />
        </div>

        <div className="wj-section">
          <p className="wj-section-title">Additional Notes</p>
          <textarea className="wj-field min-h-[60px]" placeholder="Any other notes for the client…" value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="wj-action-bar flex-col gap-2 sm:flex-row">
        <button onClick={save} disabled={saving} className="wj-btn-primary flex-1">
          <Save className="h-4 w-4" />{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Quote'}
        </button>
        {id && (
          <button onClick={deleteQuote} disabled={saving} className="wj-btn-secondary flex-1 border-red-500/40 text-red-200 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" /> Delete Quote
          </button>
        )}
        <button onClick={exportPrint} className="wj-btn-secondary flex-1">
          <FileDown className="h-4 w-4" /> Export / Print PDF
        </button>
        <a
          href={`mailto:${clientEmail}?subject=Quote ${quoteNumber}&body=Please find quote ${quoteNumber} for ${formatCurrency(total)}.`}
          className="wj-btn-secondary flex flex-1 items-center justify-center gap-2"
        >
          <Mail className="h-4 w-4" /> Email Quote PDF
        </a>
      </div>
    </div>
  )
}
