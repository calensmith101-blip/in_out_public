import type { WorkspaceId } from '@/lib/workspaces'

type LineItem = {
  description?: string
  qty?: number
  unitPrice?: number
  lineType?: string
  total?: number
}

type DocKind = 'Quote' | 'Tax Invoice'

type BuildDocArgs = {
  kind: DocKind
  number: string
  status?: string
  date?: string
  dueDate?: string
  validUntil?: string
  linkedJobNumber?: string
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  siteAddress?: string
  scopeOfWorks?: string
  lines?: LineItem[]
  gstEnabled?: boolean
  subtotal?: number
  gstAmount?: number
  total?: number
  amountPaid?: number
  balanceOwing?: number
  paymentDetails?: string
  terms?: string
  disclaimer?: string
  notes?: string
  workspaceId?: WorkspaceId | string
  clientView?: boolean
}

function escapeHtml(value: any) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function money(value: any) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value || 0))
}

function typeLabel(type?: string) {
  if (type === 'material') return 'Materials / Parts'
  if (type === 'labour') return 'Labour'
  if (type === 'travel') return 'Travel'
  return 'Other'
}

function groupedRows(lines: LineItem[], clientView: boolean) {
  const groups = ['labour', 'material', 'travel', 'other']
  return groups.map(group => {
    const rows = lines.filter(l => (l.lineType || 'labour') === group && (l.description || Number(l.total || 0) > 0))
    if (!rows.length) return ''
    const body = rows.map(l => clientView
      ? `<tr><td>${escapeHtml(l.description)}</td><td class="right bold">${money(l.total)}</td></tr>`
      : `<tr><td>${escapeHtml(l.description)}</td><td class="center">${Number(l.qty || 0)}</td><td class="right">${money(l.unitPrice)}</td><td class="right bold">${money(l.total)}</td></tr>`
    ).join('')
    const span = clientView ? 2 : 4
    return `<tr class="group"><td colspan="${span}">${typeLabel(group)}</td></tr>${body}`
  }).join('')
}

export function buildProfessionalDocumentHtml(args: BuildDocArgs) {
  const lines = args.lines || []
  const clientView = args.clientView !== false
  const balance = args.balanceOwing ?? Math.max(0, Number(args.total || 0) - Number(args.amountPaid || 0))
  const cols = clientView
    ? '<th>Description</th><th class="right">Amount</th>'
    : '<th>Description</th><th class="center">Qty</th><th class="right">Unit</th><th class="right">Amount</th>'
  const rows = groupedRows(lines, clientView) || `<tr><td colspan="${clientView ? 2 : 4}" class="muted center">No line items entered.</td></tr>`
  const title = `${args.kind} ${args.number}`
  const isInvoice = args.kind === 'Tax Invoice'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45}.page{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:18mm;box-shadow:0 8px 30px rgba(0,0,0,.12)}.top{display:flex;justify-content:space-between;gap:30px;border-bottom:3px solid #1d4ed8;padding-bottom:18px;margin-bottom:18px}.brand h1{font-size:28px;letter-spacing:.02em;margin:0;text-transform:uppercase}.brand .sub{margin-top:5px;color:#64748b;font-weight:700}.doc-title{text-align:right}.doc-title h2{font-size:28px;margin:0;text-transform:uppercase;color:#1d4ed8}.doc-title p{margin:4px 0;color:#475569}.pill{display:inline-block;margin-top:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}.box{border:1px solid #dbeafe;background:#f8fbff;border-radius:10px;padding:12px}.label{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;margin-bottom:6px}.box p{margin:2px 0}.scope{white-space:pre-wrap}.scopebox{margin-bottom:18px}.right{text-align:right}.center{text-align:center}.bold{font-weight:800}table{width:100%;border-collapse:collapse;margin:10px 0 16px}th{background:#1d4ed8;color:#fff;text-align:left;padding:9px 10px;font-size:10px;letter-spacing:.08em;text-transform:uppercase}td{padding:9px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}.group td{background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid #bfdbfe}.muted{color:#94a3b8}.totals{width:280px;margin-left:auto;border-top:2px solid #111827;padding-top:8px}.totals .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e7eb}.totals .total{font-size:19px;font-weight:900;border-bottom:none}.balance{margin-top:16px;border-radius:10px;padding:14px;text-align:center;font-weight:900}.due{background:#fff7ed;border:2px solid #f59e0b;color:#92400e}.paid{background:#f0fdf4;border:2px solid #22c55e;color:#15803d}.footer{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.small{font-size:11px;color:#475569;white-space:pre-wrap}.note{margin-top:12px;font-size:11px;color:#64748b;white-space:pre-wrap}@media print{body{background:white}.page{box-shadow:none;margin:0;width:auto;min-height:auto;padding:12mm}.no-print{display:none}}
</style></head><body><main class="page">
  <section class="top">
    <div class="brand"><h1>IN &amp; OUT</h1><div class="sub">Invoicing, Scheduling &amp; Tax</div></div>
    <div class="doc-title"><h2>${escapeHtml(args.kind)}</h2><p><strong>${escapeHtml(args.number)}</strong></p>${args.status ? `<span class="pill">${escapeHtml(args.status)}</span>` : ''}</div>
  </section>
  <section class="grid">
    <div class="box"><div class="label">Bill To</div><p><strong>${escapeHtml(args.clientName || 'Client')}</strong></p>${args.clientPhone ? `<p>${escapeHtml(args.clientPhone)}</p>` : ''}${args.clientEmail ? `<p>${escapeHtml(args.clientEmail)}</p>` : ''}${args.siteAddress ? `<p>${escapeHtml(args.siteAddress)}</p>` : ''}</div>
    <div class="box"><div class="label">Details</div><p><strong>Date:</strong> ${escapeHtml(args.date || '')}</p>${args.dueDate ? `<p><strong>Due:</strong> ${escapeHtml(args.dueDate)}</p>` : ''}${args.validUntil ? `<p><strong>Valid until:</strong> ${escapeHtml(args.validUntil)}</p>` : ''}${args.linkedJobNumber ? `<p><strong>Job:</strong> ${escapeHtml(args.linkedJobNumber)}</p>` : ''}</div>
  </section>
  ${args.scopeOfWorks ? `<section class="box scopebox"><div class="label">Scope of Works</div><div class="scope">${escapeHtml(args.scopeOfWorks)}</div></section>` : ''}
  <table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>
  <section class="totals"><div class="row"><span>Subtotal</span><strong>${money(args.subtotal)}</strong></div><div class="row"><span>GST</span><strong>${args.gstEnabled ? money(args.gstAmount) : 'No GST'}</strong></div><div class="row total"><span>Total</span><span>${money(args.total)}</span></div></section>
  ${isInvoice ? `<section class="balance ${balance <= 0 ? 'paid' : 'due'}">${balance <= 0 ? `Paid in Full — ${money(args.total)}` : `Balance Due — ${money(balance)}`}</section>` : ''}
  <section class="footer"><div class="box"><div class="label">Payment / Terms</div><div class="small">${escapeHtml(args.paymentDetails || args.terms || '')}</div></div><div class="box"><div class="label">Notes</div><div class="small">${escapeHtml(args.disclaimer || args.notes || '')}</div></div></section>
  ${args.notes && isInvoice ? `<div class="note"><strong>Extra notes:</strong> ${escapeHtml(args.notes)}</div>` : ''}
  ${args.notes && !isInvoice ? `<div class="note"><strong>Extra notes:</strong> ${escapeHtml(args.notes)}</div>` : ''}
</main></body></html>`
}
