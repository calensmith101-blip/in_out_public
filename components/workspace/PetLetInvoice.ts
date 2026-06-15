'use client'

function money(value: any) {
  const n = Number(value || 0)
  return `$${n.toFixed(2)}`
}

function safe(value: any, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value)
}

export function exportPetLetInvoice(job: any = {}, labour: any[] = []) {
  const businessName =
    job.businessName ||
    job.contractorName ||
    job.accountName ||
    'Your Business Name'

  const abn = job.abn || 'ABN'
  const email = job.email || job.businessEmail || ''
  const phone = job.phone || job.businessPhone || ''
  const bsb = job.bsb || ''
  const accountNumber = job.accountNumber || job.account || ''
  const accountName = job.accountName || businessName

  const invoiceNumber = job.invoiceNumber || job.jobNumber || `PL-${Date.now()}`
  const invoiceDate =
    job.invoiceDate ||
    job.date ||
    new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const invoiceType =
    job.petletWorkType ||
    job.invoiceType ||
    job.type ||
    'Garden Maintenance'

  const rows = labour.length
    ? labour
    : [
        {
          date: job.date || '',
          petletProperty: job.petletProperty || job.propertyCode || '',
          description: job.jobDescription || job.description || '',
          hours: job.hours || 1,
          rate: job.rate || 0,
          amount: job.amount || job.total || 0,
        },
      ]

  const subtotal = rows.reduce((sum, item) => {
    const qty = Number(item.qty ?? item.hours ?? item.quantity ?? 1)
    const rate = Number(item.rate ?? item.ratePerHour ?? item.unitPrice ?? 0)
    const amount = Number(item.amount ?? item.totalCost ?? item.total ?? qty * rate)
    return sum + amount
  }, 0)

  const rowHtml = rows
    .map((item) => {
      const qty = Number(item.qty ?? item.hours ?? item.quantity ?? 1)
      const rate = Number(item.rate ?? item.ratePerHour ?? item.unitPrice ?? 0)
      const amount = Number(item.amount ?? item.totalCost ?? item.total ?? qty * rate)

      const extras = [
        item.receiptAttached ? 'receipt attached' : '',
        item.preApproved ? 'pre-approved by Ops' : '',
      ]
        .filter(Boolean)
        .join(' · ')

      return `
        <tr>
          <td>${safe(item.date || item.invoiceDate || '')}</td>
          <td class="property">${safe(item.petletProperty || item.propertyCode || '')}</td>
          <td>
            ${safe(item.description || item.name || item.workType || '')}
            ${extras ? `<div class="muted">${extras}</div>` : ''}
          </td>
          <td class="num">${qty.toFixed(qty % 1 === 0 ? 0 : 1)}</td>
          <td class="num">${money(rate)}</td>
          <td class="num">${money(amount)}</td>
        </tr>
      `
    })
    .join('')

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoiceNumber}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 13px;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
    }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      margin-bottom: 28px;
    }

    h1 {
      margin: 0;
      font-size: 30px;
      letter-spacing: 0.5px;
      font-weight: 800;
    }

    .business {
      text-align: right;
      line-height: 1.5;
      font-size: 13px;
    }

    .business strong {
      display: block;
      font-size: 18px;
      margin-bottom: 2px;
    }

    .meta {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 6px 12px;
      margin: 18px 0 24px;
      max-width: 360px;
    }

    .meta .label {
      color: #6b7280;
      font-weight: 700;
    }

    .billto {
      background: #eef7ff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .section-title {
      color: #2563eb;
      font-weight: 800;
      letter-spacing: 1.5px;
      font-size: 13px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    th {
      background: #eef7ff;
      color: #374151;
      text-align: left;
      padding: 10px 8px;
      border-bottom: 1px solid #dbeafe;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    .property {
      font-weight: 700;
      color: #111827;
      white-space: nowrap;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .muted {
      color: #6b7280;
      font-size: 11px;
      margin-top: 3px;
    }

    .totals {
      margin-left: auto;
      margin-top: 22px;
      width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .total-row strong {
      font-size: 16px;
    }

    .payment {
      background: #eef7ff;
      border-radius: 8px;
      padding: 16px;
      margin-top: 30px;
      line-height: 1.6;
    }

    @media print {
      body {
        padding: 0;
      }

      .page {
        max-width: none;
        padding: 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div>
        <h1>TAX INVOICE</h1>

        <div class="meta">
          <div class="label">Invoice number</div>
          <div>${safe(invoiceNumber)}</div>

          <div class="label">Invoice date</div>
          <div>${safe(invoiceDate)}</div>

          <div class="label">Type</div>
          <div>${safe(invoiceType)}</div>
        </div>
      </div>

      <div class="business">
        <strong>${safe(businessName)}</strong>
        <div>ABN: ${safe(abn)}</div>
        <div>${safe(email)}${email && phone ? ' · ' : ''}${safe(phone)}</div>
        <div>BSB: ${safe(bsb)}${bsb && accountNumber ? ' · ' : ''}Acc: ${safe(accountNumber)}</div>
      </div>
    </div>

    <div class="billto">
      <div class="section-title">Bill To</div>
      <strong>Pet Let Holiday Homes</strong><br />
      accounts@petlet.net.au
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Property</th>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${money(subtotal)}</span>
      </div>

      <div class="total-row">
        <span>GST</span>
        <span>No GST applies</span>
      </div>

      <div class="total-row">
        <strong>Total due</strong>
        <strong>${money(subtotal)}</strong>
      </div>
    </div>

    <div class="payment">
      <div class="section-title">Payment Details</div>
      <strong>Account name:</strong> ${safe(accountName)}<br />
      <strong>BSB:</strong> ${safe(bsb)} · <strong>Account:</strong> ${safe(accountNumber)}
    </div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print()
      }, 300)
    }
  </script>
</body>
</html>
`

  const win = window.open('', '_blank')
  if (!win) return

  win.document.open()
  win.document.write(html)
  win.document.close()
}
