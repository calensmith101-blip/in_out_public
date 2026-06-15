'use client'

import { useState } from 'react'
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { ImagePlus, Printer, Save, X } from 'lucide-react'
import { safeCreateUserDoc } from '@/lib/safeFirestore'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { nextNumber } from '@/lib/counters'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
function makeClientId(prefix = 'item') {
  const c = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const disclaimer = 'Please note: this is a rough quote prepared with AI assistance based on the information provided. Final pricing may vary depending on access, materials, job scope, and anything found on inspection. You will be informed of any changes before work begins or before any additional work is carried out.'

type PhotoPreview = { name: string; size: number; preview: string }

export default function AIQuotePage() {
  const user = useFirebaseUser()
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', jobType: '', photoNote: '', description: '', hourlyRate: 70, travelCharge: 35, materialMarkup: 20 })
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [draft, setDraft] = useState<any>(null)
  const [quoteNumber, setQuoteNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')

  function set(name: string, value: any) { setForm(prev => ({ ...prev, [name]: value })) }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const next = await Promise.all(Array.from(files).slice(0, 8).map(file => new Promise<PhotoPreview>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, size: file.size, preview: String(reader.result || '') })
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })))
    setPhotos(prev => [...prev, ...next].slice(0, 8))
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setSaved(''); setError('')
    const photoSummary = photos.map((p, i) => `Photo ${i + 1}: ${p.name}`).join('\n')
    const payload = { ...form, photoCount: photos.length, photoNames: photos.map(p => p.name), photoNote: [form.photoNote, photoSummary].filter(Boolean).join('\n') }
    try {
      const res = await fetch('/api/ai-rough-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      setDraft(recalculateDraft(json, form))
      setQuoteNumber(prev => prev || nextQuoteNumber())
    } catch {
      setDraft(recalculateDraft(fallbackDraft(payload), form))
      setQuoteNumber(prev => prev || nextQuoteNumber())
    } finally { setLoading(false) }
  }

  async function saveDraft() {
    if (!draft) return
    setSaved(''); setError('')
    const photoSummary = photos.map(p => ({ name: p.name, size: p.size }))
    const payload = { quoteNumber: quoteNumber || nextQuoteNumber(), ...form, photoCount: photos.length, photoSummary, ...draft, disclaimer, status: 'draft', createdAt: new Date().toISOString(), updatedAtText: new Date().toISOString() }
    try {
      if (typeof window !== 'undefined') {
        const rows = JSON.parse(window.localStorage.getItem('tradieday_ai_rough_quotes_v1') || '[]')
        window.localStorage.setItem('tradieday_ai_rough_quotes_v1', JSON.stringify([{ ...payload, localId: `ai-${Date.now()}` }, ...rows]))
      }
      setSaved(user ? 'Saved locally. Syncing to Firebase…' : 'Saved locally. Sign in to sync to Firebase.')
      if (user) {
        ;(async () => {
          try {
            const result = await safeCreateUserDoc(user.uid, 'aiRoughQuotes', { ...payload, updatedAt: serverTimestamp() }, 2500)
            setSaved(result.timedOut ? 'Saved locally. Firebase timed out but your draft is safe here.' : 'Saved locally and to Firebase.')
          } catch (cloudErr) {
            console.error('AI rough quote Firebase sync failed, local copy kept', cloudErr)
            setSaved('Saved locally. Firebase failed, but your draft is safe here.')
          }
        })()
      }
    } catch (err: any) {
      console.error('AI rough quote save failed', err)
      setError(err.message || 'Could not save AI quote.')
    }
  }

  function updateDraftField(name: string, value: any) {
    setDraft((current: any) => recalculateDraft({ ...current, [name]: value }, form))
  }

  function updateLineItem(index: number, field: string, value: any) {
    setDraft((current: any) => {
      const rows = Array.isArray(current?.lineItems) ? [...current.lineItems] : []
      rows[index] = { ...rows[index], [field]: value }
      return recalculateDraft({ ...current, lineItems: rows }, form)
    })
  }

  function addLineItem() {
    setDraft((current: any) => recalculateDraft({
      ...current,
      lineItems: [...(Array.isArray(current?.lineItems) ? current.lineItems : []), { item: 'Additional allowance', qty: '1', rate: 0, low: 0, high: 0 }]
    }, form))
  }

  function removeLineItem(index: number) {
    setDraft((current: any) => recalculateDraft({ ...current, lineItems: (current?.lineItems || []).filter((_: any, i: number) => i !== index) }, form))
  }



  async function createFormalQuote() {
    if (!draft) return
    if (!user) { setError('Sign in first so the quote can be saved online.'); return }
    setSaved(''); setError('')
    try {
      const formalQuoteNumber = await nextNumber(user.uid, 'my-business', 'quote')
      const quoteRef = doc(collection(db, userCollectionPath(user.uid, 'quotes')))
      const lineItems = (Array.isArray(draft.lineItems) ? draft.lineItems : []).map((row: any) => {
        const label = String(row.item || '').toLowerCase()
        const isLabour = label.includes('labour')
        const isMaterial = label.includes('material') || label.includes('part') || label.includes('allowance')
        const isTravel = label.includes('travel') || label.includes('call-out') || label.includes('callout')
        const high = Number(row.high ?? row.low ?? 0)
        const qty = isLabour ? Number(draft.labourHoursHigh || draft.labourHoursLow || 1) : 1
        const unitPrice = isLabour ? Number(form.hourlyRate || row.rate || 70) : high
        return {
          id: makeClientId('photo'),
          description: row.item || 'Quote item',
          qty,
          unitPrice,
          lineType: isLabour ? 'labour' : isMaterial ? 'material' : isTravel ? 'travel' : 'other',
          total: qty * unitPrice,
        }
      })
      const subtotal = lineItems.reduce((sum: number, line: any) => sum + Number(line.total || 0), 0)
      const gstEnabled = true
      const gstAmount = gstEnabled ? subtotal * 0.1 : 0
      const payload = {
        quoteNumber: formalQuoteNumber,
        workspaceId: 'my-business',
        status: 'DRAFT',
        clientName: form.customerName,
        clientPhone: form.phone,
        clientEmail: '',
        siteAddress: form.address,
        customerName: form.customerName,
        customerPhone: form.phone,
        customerEmail: '',
        scopeOfWorks: draft.scope || form.description,
        lines: lineItems,
        gstEnabled,
        subtotal,
        gstAmount,
        total: subtotal + gstAmount,
        terms: 'Payment is due within 7 days of invoice date. Please pay via bank transfer.',
        disclaimer,
        additionalNotes: draft.clientMessage || '',
        quoteDate: new Date().toISOString().slice(0,10),
        source: 'ai-rough-quote',
        aiRoughQuoteNumber: quoteNumber,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }
      await Promise.all([
        setDoc(quoteRef, payload, { merge: true }),
        setDoc(doc(db, 'users', user.uid, 'workspaces', 'my-business', 'quotes', quoteRef.id), payload, { merge: true }),
      ])
      setSaved(`Created formal quote ${formalQuoteNumber}. Opening it now…`)
      window.location.href = `/quotes/${quoteRef.id}`
    } catch (err: any) {
      console.error('Create formal quote from AI failed', err)
      setError(err.message || 'Could not create the formal quote online.')
    }
  }

  function printDraft() {
    if (!draft || typeof window === 'undefined') return
    const safe = (value: any) => String(value ?? '').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[ch])
    const rows = (draft.lineItems || []).map((row: any) => `<tr><td>${safe(row.item)}</td><td>${safe(row.qty)}</td><td>${formatCurrency(Number(row.rate || 0))}</td><td>${formatCurrency(Number(row.low || 0))} - ${formatCurrency(Number(row.high || 0))}</td></tr>`).join('')
    const win = window.open('', '_blank', 'width=900,height=1000')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>${safe(quoteNumber || 'AI Rough Quote')}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:32px}h1{margin:0}.muted{color:#555}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.box{border:1px solid #ddd;border-radius:10px;padding:12px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #ddd;padding:9px;text-align:left}th{background:#f3f3f3}.total{font-size:22px;font-weight:700}.small{font-size:12px;color:#555;white-space:pre-line}</style></head><body><h1>ROUGH QUOTE</h1><p class="muted">${safe(quoteNumber || '')}</p><div class="grid"><div class="box"><b>Client</b><br>${safe(form.customerName)}<br>${safe(form.phone)}<br>${safe(form.address)}</div><div class="box"><b>Job</b><br>${safe(form.jobType)}<br>${safe(draft.complexity || '')}<br>${safe(draft.labourHoursLow)}-${safe(draft.labourHoursHigh)} hrs estimated</div></div><p><b>Scope:</b><br>${safe(draft.scope)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Estimate</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Estimate: ${formatCurrency(draft.priceLow)} - ${formatCurrency(draft.priceHigh)}</p><p><b>Client message</b></p><p>${safe(draft.clientMessage)}</p><p class="small">${safe(disclaimer)}</p></body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  return <div className="grid lg:grid-cols-[420px_1fr] gap-6">
    <form onSubmit={generate} className="wj-card p-5 space-y-4"><div><h1 className="text-2xl font-bold">AI Rough Quote</h1><p className="text-wj-muted">Generate a draft only. Review and edit before sending.</p></div>
      {['customerName','phone','address','jobType'].map(k => <label key={k}><span className="wj-label">{k.replace(/([A-Z])/g, ' $1')}</span><input className="wj-input" value={(form as any)[k]} onChange={e => set(k, e.target.value)} /></label>)}

      <div className="rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div><span className="wj-label">Insert job photos</span><p className="text-xs text-wj-muted">Add up to 8 photos so the rough quote can account for size, access and damage.</p></div>
          <label className="wj-btn-secondary cursor-pointer whitespace-nowrap"><ImagePlus className="h-4 w-4" /> Add pics<input className="hidden" type="file" accept="image/*" capture="environment" multiple onChange={e => addPhotos(e.target.files)} /></label>
        </div>
        {photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <img src={photo.preview} alt={photo.name} className="h-24 w-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/80 p-1 text-white"><X className="h-3 w-3" /></button>
            <p className="truncate px-2 py-1 text-[11px] text-zinc-400">{photo.name}</p>
          </div>)}
        </div>}
      </div>

      <label><span className="wj-label">Photo note</span><input className="wj-input" placeholder="Example: broken hinge, weeds around side path, hard access…" value={form.photoNote} onChange={e => set('photoNote', e.target.value)} /></label>
      <label><span className="wj-label">Job description / problem</span><textarea className="wj-input min-h-32" value={form.description} onChange={e => set('description', e.target.value)} required /></label>
      <div className="grid grid-cols-3 gap-3"><label><span className="wj-label">Hourly</span><input className="wj-input" type="number" value={form.hourlyRate} onChange={e => set('hourlyRate', Number(e.target.value))} /></label><label><span className="wj-label">Travel / call-out</span><input className="wj-input" type="number" value={form.travelCharge} onChange={e => set('travelCharge', Number(e.target.value))} /></label><label><span className="wj-label">Markup %</span><input className="wj-input" type="number" value={form.materialMarkup} onChange={e => set('materialMarkup', Number(e.target.value))} /></label></div>
      <button className="wj-btn-primary w-full justify-center" disabled={loading}>{loading ? 'Generating...' : 'Generate rough quote'}</button>
    </form>
    <section className="wj-card p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Draft result</h2>{draft && <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{quoteNumber}</span>}</div>{!draft && <p className="text-wj-muted">Enter the job details, add photos if you have them, then generate a rough quote draft.</p>}{draft && <>
      <div className="grid sm:grid-cols-4 gap-3"><Info label="Low" value={formatCurrency(draft.priceLow)} /><Info label="High" value={formatCurrency(draft.priceHigh)} /><Info label="Labour" value={`${draft.labourHoursLow ?? 0}-${draft.labourHoursHigh ?? 0} hrs`} /><Info label="Complexity" value={draft.complexity || '—'} /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><label><span className="wj-label">Low hrs</span><input className="wj-input" type="number" step="0.25" value={draft.labourHoursLow ?? 0} onChange={e => updateDraftField('labourHoursLow', Number(e.target.value))} /></label><label><span className="wj-label">High hrs</span><input className="wj-input" type="number" step="0.25" value={draft.labourHoursHigh ?? 0} onChange={e => updateDraftField('labourHoursHigh', Number(e.target.value))} /></label><label><span className="wj-label">Low total</span><input className="wj-input" type="number" step="0.01" value={draft.priceLow ?? 0} onChange={e => setDraft((d:any) => ({ ...d, priceLow: Number(e.target.value) }))} /></label><label><span className="wj-label">High total</span><input className="wj-input" type="number" step="0.01" value={draft.priceHigh ?? 0} onChange={e => setDraft((d:any) => ({ ...d, priceHigh: Number(e.target.value) }))} /></label></div>
      {Array.isArray(draft.lineItems) && <div><div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-semibold">Editable estimate breakdown</h3><button type="button" className="wj-btn-secondary text-xs" onClick={addLineItem}>Add item</button></div><div className="space-y-3">{draft.lineItems.map((row: any, index: number) => <div key={`${row.item}-${index}`} className="rounded-xl border border-zinc-800 p-3"><div className="grid gap-2 sm:grid-cols-[1.4fr_.7fr_.7fr_.7fr_.7fr_auto]"><input className="wj-input" value={row.item || ''} onChange={e => updateLineItem(index, 'item', e.target.value)} /><input className="wj-input" value={row.qty || ''} onChange={e => updateLineItem(index, 'qty', e.target.value)} /><input className="wj-input" type="number" step="0.01" value={row.rate ?? 0} onChange={e => updateLineItem(index, 'rate', Number(e.target.value))} /><input className="wj-input" type="number" step="0.01" value={row.low ?? 0} onChange={e => updateLineItem(index, 'low', Number(e.target.value))} /><input className="wj-input" type="number" step="0.01" value={row.high ?? 0} onChange={e => updateLineItem(index, 'high', Number(e.target.value))} /><button type="button" className="wj-btn-secondary" onClick={() => removeLineItem(index)}>Remove</button></div><p className="mt-1 text-xs text-zinc-500">Item / qty / rate / low / high</p></div>)}</div></div>}
      <Box title="Scope" text={draft.scope} /><Box title="Materials" text={Array.isArray(draft.materials) ? draft.materials.join('\n') : draft.materials} /><Box title="Questions to ask" text={Array.isArray(draft.questions) ? draft.questions.join('\n') : draft.questions} /><Box title="Risks / unknowns" text={Array.isArray(draft.risks) ? draft.risks.join('\n') : draft.risks} />
      <label><span className="wj-label">Client message — editable</span><textarea className="wj-input min-h-40" value={draft.clientMessage || ''} onChange={e => setDraft((d:any) => ({ ...d, clientMessage: e.target.value }))} /></label>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{disclaimer}</div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={saveDraft} className="wj-btn-primary"><Save className="h-4 w-4" /> Save draft</button><button type="button" onClick={printDraft} className="wj-btn-secondary"><Printer className="h-4 w-4" /> Print / Save PDF</button><button type="button" onClick={createFormalQuote} className="wj-btn-secondary">Import to Quote</button></div>{saved && <span className="text-green-300 ml-3 text-sm">{saved}</span>}{error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </>}</section>
  </div>
}
function Info({ label, value }: { label: string, value: string }) { return <div className="bg-wj-elevated rounded-lg p-3"><p className="text-xs text-wj-muted">{label}</p><p className="font-semibold">{value}</p></div> }
function Box({ title, text }: { title: string, text: string }) { return <div><h3 className="font-semibold mb-1">{title}</h3><p className="whitespace-pre-line text-sm text-wj-subtle">{text || '—'}</p></div> }
function nextQuoteNumber() {
  if (typeof window === 'undefined') return `AIQ-${Date.now()}`
  const key = 'tradieday_ai_rough_quote_counter_v1'
  const next = Number(window.localStorage.getItem(key) || '1000') + 1
  window.localStorage.setItem(key, String(next))
  return `AIQ-${next}`
}

function recalculateDraft(draft: any, form: any) {
  if (!draft) return draft
  const hourly = Number(form.hourlyRate || 0)
  const lowHours = Math.max(0, Number(draft.labourHoursLow || 0))
  const highHours = Math.max(lowHours, Number(draft.labourHoursHigh || lowHours))
  let lineItems = Array.isArray(draft.lineItems) ? draft.lineItems.map((row: any) => ({ ...row })) : []
  lineItems = lineItems.map((row: any) => {
    if (String(row.item || '').toLowerCase().includes('labour')) {
      return { ...row, qty: `${lowHours}-${highHours} hrs`, rate: hourly, low: Math.round(lowHours * hourly), high: Math.round(highHours * hourly) }
    }
    return { ...row, low: Number(row.low || 0), high: Number(row.high ?? row.low ?? 0), rate: Number(row.rate || 0) }
  })
  const priceLow = Math.round(lineItems.reduce((sum: number, row: any) => sum + Number(row.low || 0), 0))
  const priceHigh = Math.round(lineItems.reduce((sum: number, row: any) => sum + Number(row.high ?? row.low ?? 0), 0))
  return { ...draft, labourHoursLow: lowHours, labourHoursHigh: highHours, lineItems, priceLow, priceHigh }
}

function fallbackDraft(form: any) {
  const hourly = Number(form.hourlyRate || 70)
  const travel = Number(form.travelCharge || 0)
  const markup = 1 + Number(form.materialMarkup || 0) / 100
  const rawText = `${form.jobType || ''} ${form.description || ''} ${form.photoNote || ''}`
  const text = rawText.toLowerCase()
  const jobName = String(form.jobType || form.description || 'property maintenance job').trim()

  const patterns: Array<{ category: string; match: RegExp; lowH: number; highH: number; matLow: number; matHigh: number; complexity: string; scope: string; materials: string[]; questions: string[]; risks: string[] }> = [
    { category: 'Window / glass / screen repair', match: /window|glass|glazing|flyscreen|fly screen|security screen|sliding window|sash/, lowH: 2, highH: 7, matLow: 80, matHigh: 650, complexity: 'Specialist', scope: 'Measure and inspect the window/screen area, remove damaged sections where practical, fit or source suitable replacement material, seal/tidy and test operation.', materials: ['Glass/screen mesh or replacement panel allowance', 'Spline/beading/sealant/fixings', 'Disposal/consumables if required'], questions: ['What are the exact width and height?', 'Is it glass, flyscreen, frame or sliding mechanism?', 'Is the window ground floor and easy to access?'], risks: ['Custom glass may require supplier pricing', 'Damaged/rotten frames can add labour', 'Safety glass may require a glazier'] },
    { category: 'Door / lock / hinge repair', match: /door|lock|handle|hinge|latch|strike plate|privacy set|entry set|sliding door/, lowH: 1, highH: 4, matLow: 25, matHigh: 250, complexity: 'Small', scope: 'Inspect door alignment and hardware, adjust or replace hinges/handles/latches where required, then test smooth opening, closing and locking.', materials: ['Hinges/handle/latch/strike allowance', 'Screws/packers/fixings', 'Lubricant and consumables'], questions: ['Is it internal, external or sliding?', 'Is it sticking, sagging, not closing or not locking?', 'Do you want matching hardware supplied?'], risks: ['Frame movement can add labour', 'Special locks may need ordering', 'Security hardware may need specialist parts'] },
    { category: 'Irrigation', match: /irrigation|sprinkler|solenoid|controller|retic|drip|poly pipe|popup|pop up|watering system/, lowH: 3, highH: 8, matLow: 80, matHigh: 450, complexity: 'Specialist', scope: 'Diagnose the irrigation issue, repair or install confirmed components, test pressure/coverage, adjust heads and confirm controller/zone operation.', materials: ['Poly pipe/fittings/risers/nozzles', 'Sprinkler heads or drip components', 'Solenoid/controller parts only if confirmed faulty'], questions: ['How many zones are affected?', 'Is it leaking, blocked, low pressure or controller related?', 'Do you know where the valves are?'], risks: ['Hidden pipe damage/roots may increase labour', 'Buried valves can take time to find', 'Controller faults may need parts'] },
    { category: 'CCTV / security', match: /cctv|camera|alarm|security|sensor|pir|reed|keypad|siren|dvr|nvr/, lowH: 2.5, highH: 7, matLow: 50, matHigh: 350, complexity: 'Specialist', scope: 'Confirm device positions/cable routes, install or troubleshoot requested security equipment, test recording/app/network operation and basic handover.', materials: ['Cable/connectors/fixings allowance', 'Mounting hardware', 'Patch leads/power/network accessories'], questions: ['How many devices are involved?', 'Do you already have equipment?', 'Is roof access available?', 'Do you need app setup?'], risks: ['Cable paths and roof access affect labour', 'Network/password issues can slow setup', 'Faulty supplied equipment may need replacement'] },
    { category: 'AV / data / TV', match: /tv mount|television|projector|speaker|home theatre|antenna|data point|ethernet|cat6|av rack|hdmi/, lowH: 1.5, highH: 5, matLow: 30, matHigh: 250, complexity: 'Specialist', scope: 'Install, mount, connect or troubleshoot the AV/data equipment, tidy cabling where practical, configure basic settings and test operation.', materials: ['Cable/connectors/fixings', 'Wall plates/brackets if required', 'HDMI/data/speaker leads if not supplied'], questions: ['Do you have the bracket/equipment?', 'What wall type is it?', 'Do you want cables hidden?', 'Are power/data points nearby?'], risks: ['Wall type changes method', 'Cable concealment can add time', 'Extra brackets/cables may be required'] },
    { category: 'Gardening / yard clean-up', match: /garden|gardening|weeding|weed|mowing|lawn|hedge|prun|green waste|yard|clean ?up|cleanup|mulch|tree|shrub/, lowH: 1.5, highH: 7, matLow: 15, matHigh: 180, complexity: 'Medium', scope: 'Complete the garden/property tidy-up within agreed areas, cut back/weed/mow/prune as described, tidy paths/edges and handle green waste as agreed.', materials: ['Green waste disposal allowance if required', 'Consumables/fuel allowance', 'Weed treatment only if requested'], questions: ['Can you send photos of the whole area?', 'Do you need green waste removed?', 'Is there side/rear access?'], risks: ['Heavy overgrowth adds time', 'Green waste volume affects disposal cost', 'Weather can affect timing'] },
    { category: 'Fence / gate / deck / outdoor structure', match: /fence|gate|deck|retaining|concrete|paving|screen|pergola|post|rail/, lowH: 4, highH: 14, matLow: 120, matHigh: 900, complexity: 'Large', scope: 'Inspect/measure the outdoor repair or replacement, remove failed sections where required, supply/fit suitable materials and leave the area safe.', materials: ['Timber/posts/rails/hardware allowance', 'Concrete/fixings/brackets if required', 'Disposal/consumables'], questions: ['Can you send measurements and photos?', 'Repair only or replacement?', 'What material/style do you want?'], risks: ['Material pricing varies strongly', 'Hidden rot/damage may increase scope', 'Structural work may need approval/licensed trade'] },
    { category: 'Painting / patching / plaster', match: /paint|painting|plaster|gyprock|patch|hole|crack|cornice|skirting|wall repair/, lowH: 2, highH: 8, matLow: 40, matHigh: 300, complexity: 'Medium', scope: 'Prepare and repair affected surfaces, patch/fill/sand where required, prime/paint where included and leave the area neat.', materials: ['Filler/plaster/compound/sandpaper', 'Primer/paint allowance if required', 'Drop sheets/tape/consumables'], questions: ['How large is the damaged area?', 'Do you have matching paint?', 'Touch-up or full wall?'], risks: ['Paint match may not be exact', 'Drying time can require a return visit', 'Water damage may need extra repair'] },
  ]
  let p = patterns.find(x => x.match.test(text)) || { category: jobName, lowH: 1.5, highH: 5, matLow: 35, matHigh: 260, complexity: 'Medium', scope: `Inspect and complete ${jobName}. Confirm access, measurements and scope before work starts, complete the agreed maintenance/repair/install work and leave the area tidy.`, materials: [`Materials/parts specifically required for ${jobName}`, 'Fixings/fasteners/sealants or consumables as needed', 'Replacement parts only once confirmed'], questions: ['Can you send clear photos from a few angles?', 'Do you have measurements or part details?', 'Is access easy and parking available?'], risks: ['Hidden damage, poor access or extra parts may change the final price', 'Licensed electrical/plumbing/gas/structural work may need a licensed trade'] }
  let lowH = p.lowH
  let highH = p.highH
  let matLow = Math.round(p.matLow * markup)
  let matHigh = Math.round(p.matHigh * markup)
  if (/urgent|asap|same day|after hours|weekend|unsafe|leaking|broken|not working|failed|stuck/.test(text)) { highH += 1.5; matHigh += 90 }
  if (/multiple|several|whole|full|large|big|entire|all|four|five|six|7|8|9|10/.test(text)) { lowH += 0.75; highH += 4; matHigh += 220 }
  if (/just|small|quick|minor|single|one |tighten|adjust/.test(text)) { highH = Math.max(lowH + 1, highH - 1); matHigh = Math.max(matLow + 40, matHigh - 90) }
  const contingencyLow = Math.round((lowH * hourly + matLow) * 0.05)
  const contingencyHigh = Math.round((highH * hourly + matHigh) * 0.12)
  const priceLow = Math.round(lowH * hourly + matLow + travel + contingencyLow)
  const priceHigh = Math.round(highH * hourly + matHigh + travel + contingencyHigh)
  return {
    scope: p.scope,
    complexity: p.complexity,
    category: p.category,
    labourHoursLow: lowH,
    labourHoursHigh: highH,
    materials: p.materials,
    lineItems: [
      { item: `Labour - ${p.category}`, qty: `${lowH}-${highH} hrs`, rate: hourly, low: Math.round(lowH * hourly), high: Math.round(highH * hourly) },
      { item: `Materials / parts allowance - ${jobName}`, qty: '1', rate: matLow, low: matLow, high: matHigh },
      { item: 'Travel / call-out allowance', qty: '1', rate: travel, low: travel, high: travel },
      { item: 'Contingency / unknowns', qty: '1', rate: contingencyLow, low: contingencyLow, high: contingencyHigh },
    ],
    questions: p.questions,
    risks: p.risks,
    priceLow,
    priceHigh,
    clientMessage: `Thanks for the details. For ${jobName.toLowerCase()}, I would allow roughly ${lowH}-${highH} hours plus materials/parts as required. A rough estimate is around ${formatCurrency(priceLow)} to ${formatCurrency(priceHigh)}. I can firm this up once access, measurements and photos are confirmed. ${disclaimer}`,
  }
}
