const fmt = (n?: number | null) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(n || 0))

export function exportMyBusinessJobPack(job: any, quotes: any[], invoices: any[], materials: any[], labour: any[], payments: any[], events: any[]) {
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const section = (title: string, rows: string[]) => rows.length === 0 ? '' : `
    <section>
      <h2>${title}</h2>
      ${rows.map(r => `<p class="row">${r}</p>`).join('')}
    </section>`

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Job Pack — ${job.jobTitle}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;font-size:13px;color:#111;padding:32px;max-width:800px;margin:auto}
  h1{font-size:22px;font-weight:800;margin-bottom:4px}.meta{color:#555;font-size:12px;margin-bottom:24px}
  h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555;border-bottom:1px solid #e5e5e5;padding-bottom:4px;margin:20px 0 8px}
  .row{padding:4px 0;border-bottom:1px solid #f5f5f5}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
  .summary-cell{background:#f9f9f9;border-radius:6px;padding:10px 12px}.summary-cell .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#777}
  .summary-cell .val{font-size:16px;font-weight:800;margin-top:2px}
</style></head><body>
<h1>${job.jobTitle}</h1>
<p class="meta">Generated ${date} · TradieDay — My Business</p>
${section('Client Info', [
  job.customerName && `Customer: ${job.customerName}`,
  job.customerPhone && `Phone: ${job.customerPhone}`,
  job.customerEmail && `Email: ${job.customerEmail}`,
  job.siteAddress && `Site: ${job.siteAddress}`,
  job.jobDescription && `Description: ${job.jobDescription}`,
].filter(Boolean) as string[])}
<div class="summary">
  <div class="summary-cell"><div class="label">Quoted</div><div class="val">${fmt(job.totalQuoted)}</div></div>
  <div class="summary-cell"><div class="label">Invoiced</div><div class="val">${fmt(job.totalInvoiced)}</div></div>
  <div class="summary-cell"><div class="label">Paid</div><div class="val">${fmt(job.totalPaid)}</div></div>
  <div class="summary-cell"><div class="label">Materials</div><div class="val">${fmt(job.totalMaterials)}</div></div>
  <div class="summary-cell"><div class="label">Labour</div><div class="val">${fmt(job.totalLabour)}</div></div>
  <div class="summary-cell"><div class="label">Balance Due</div><div class="val">${fmt(job.balanceDue)}</div></div>
</div>
${section('Quotes', quotes.map(q => `${q.quoteNumber||'Quote'} · ${q.status} · ${fmt(q.total)}${q.description?' — '+q.description:''}`))}
${section('Invoices', invoices.map(i => `${i.invoiceNumber||'Invoice'} · ${i.status} · Total: ${fmt(i.total)} Paid: ${fmt(i.amountPaid)} Owing: ${fmt(i.balanceOwing)}`))}
${section('Materials', materials.map(m => `${m.name}${m.supplier?' ('+m.supplier+')':''} · Qty: ${m.quantity||1} · ${fmt(m.totalCost)}`))}
${section('Labour', labour.map(l => `${l.description}${l.date?' · '+l.date:''}${l.hours?' · '+l.hours+'h':''} · ${fmt(l.totalCost)}`))}
${section('Payments', payments.map(p => `${fmt(p.amount)} · ${p.method||'Manual'}${p.paymentDate?' · '+p.paymentDate:''}`))}
${section('Notes', events.map(e => `[${e.eventType||'note'}] ${e.content}`))}
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${job.jobTitle.replace(/[^a-z0-9]/gi, '_')}_job_pack.html`
  a.click()
  URL.revokeObjectURL(url)
  window.open(url, '_blank')
}
