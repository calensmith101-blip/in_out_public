export type DemoJob = {
  id: string
  jobNumber: string
  title: string
  clientName: string
  phone: string
  address: string
  suburb: string
  status: string
  bookedFor: string
  description: string
  notes: string
  labourHours: number
  materials: number
  total: number
}

export type DemoInvoice = {
  id: string
  invoiceNumber: string
  jobNumber: string
  clientName: string
  email: string
  address: string
  status: string
  invoiceDate: string
  dueDate: string
  items: { description: string; qty: number; rate: number; total: number }[]
  subtotal: number
  gst: number
  total: number
  balanceOwing: number
}

export type DemoQuote = {
  id: string
  quoteNumber: string
  clientName: string
  email: string
  address: string
  status: string
  quoteDate: string
  validUntil: string
  scope: string[]
  items: { description: string; qty: number; rate: number; total: number }[]
  subtotal: number
  gst: number
  total: number
}

export const demoJobs: DemoJob[] = [
  {
    id: 'demo-job-1',
    jobNumber: 'J-DEMO-1001',
    title: 'Replace leaking tap and reseal sink',
    clientName: 'Sample Client',
    phone: '0400 000 111',
    address: '12 Demo Street, Happy Valley SA',
    suburb: 'Happy Valley',
    status: 'BOOKED',
    bookedFor: '2026-06-17 9:00 AM',
    description: 'Investigate leaking kitchen mixer, replace flexible hoses if required, reseal sink edge and test for leaks.',
    notes: 'Customer prefers morning appointment. Take white silicone and spare mixer hose set.',
    labourHours: 2.5,
    materials: 62.5,
    total: 285,
  },
  {
    id: 'demo-job-2',
    jobNumber: 'J-DEMO-1002',
    title: 'Patch wall and repaint laundry',
    clientName: 'Demo Property Group',
    phone: '0400 000 222',
    address: '8 Example Court, Morphett Vale SA',
    suburb: 'Morphett Vale',
    status: 'IN_PROGRESS',
    bookedFor: '2026-06-18 12:30 PM',
    description: 'Patch two damaged plaster sections, sand ready, undercoat, repaint laundry wall and tidy work area.',
    notes: 'Paint colour is sample only. Real accounts can save photos, notes, materials and invoice from the job.',
    labourHours: 5,
    materials: 90,
    total: 640,
  },
  {
    id: 'demo-job-3',
    jobNumber: 'J-DEMO-1003',
    title: 'Install two floating shelves',
    clientName: 'Southern Sample Homes',
    phone: '0400 000 333',
    address: '31 Placeholder Road, Seaford SA',
    suburb: 'Seaford',
    status: 'READY_TO_INVOICE',
    bookedFor: '2026-06-20 2:00 PM',
    description: 'Install two floating shelves into masonry wall, supply fixings, level and clean up.',
    notes: 'Demo job showing ready-to-invoice workflow.',
    labourHours: 2,
    materials: 35,
    total: 215,
  },
]

export const demoInvoices: DemoInvoice[] = [
  {
    id: 'demo-inv-1',
    invoiceNumber: 'INV-DEMO-1001',
    jobNumber: 'J-DEMO-1001',
    clientName: 'Sample Client',
    email: 'client@example.com',
    address: '12 Demo Street, Happy Valley SA',
    status: 'SENT',
    invoiceDate: '2026-06-10',
    dueDate: '2026-06-17',
    items: [
      { description: 'Labour - leaking tap and sink reseal', qty: 2.5, rate: 70, total: 175 },
      { description: 'Materials - sealant and fittings', qty: 1, rate: 62.5, total: 62.5 },
      { description: 'Travel / call-out', qty: 1, rate: 47.5, total: 47.5 },
    ],
    subtotal: 285,
    gst: 0,
    total: 285,
    balanceOwing: 285,
  },
  {
    id: 'demo-inv-2',
    invoiceNumber: 'INV-DEMO-1002',
    jobNumber: 'J-DEMO-1002',
    clientName: 'Demo Property Group',
    email: 'accounts@example.com',
    address: '8 Example Court, Morphett Vale SA',
    status: 'PAID',
    invoiceDate: '2026-06-12',
    dueDate: '2026-06-19',
    items: [
      { description: 'Labour - patch, sand and repaint laundry', qty: 5, rate: 70, total: 350 },
      { description: 'Materials - filler, paint consumables, fixings', qty: 1, rate: 90, total: 90 },
      { description: 'Admin / job setup / disposal', qty: 1, rate: 200, total: 200 },
    ],
    subtotal: 640,
    gst: 0,
    total: 640,
    balanceOwing: 0,
  },
]

export const demoQuotes: DemoQuote[] = [
  {
    id: 'demo-q-1',
    quoteNumber: 'Q-DEMO-1001',
    clientName: 'Sample Client',
    email: 'client@example.com',
    address: '12 Demo Street, Happy Valley SA',
    status: 'SENT',
    quoteDate: '2026-06-09',
    validUntil: '2026-07-09',
    scope: [
      'Remove damaged vanity silicone and clean surrounding surfaces.',
      'Supply and apply mould-resistant bathroom silicone.',
      'Replace two worn tap flex hoses if required after inspection.',
    ],
    items: [
      { description: 'Bathroom reseal labour', qty: 4, rate: 70, total: 280 },
      { description: 'Materials and consumables allowance', qty: 1, rate: 150, total: 150 },
      { description: 'Contingency for hidden water damage', qty: 1, rate: 250, total: 250 },
      { description: 'Return visit allowance if curing required', qty: 1, rate: 500, total: 500 },
    ],
    subtotal: 1180,
    gst: 0,
    total: 1180,
  },
  {
    id: 'demo-q-2',
    quoteNumber: 'Q-DEMO-1002',
    clientName: 'Demo Property Group',
    email: 'accounts@example.com',
    address: '8 Example Court, Morphett Vale SA',
    status: 'ACCEPTED',
    quoteDate: '2026-06-11',
    validUntil: '2026-07-11',
    scope: [
      'Patch two plaster damage areas in laundry.',
      'Sand, undercoat and repaint affected wall.',
      'Convert accepted quote into a job and invoice in the real app.',
    ],
    items: [
      { description: 'Labour - plaster patch and paint', qty: 5, rate: 70, total: 350 },
      { description: 'Materials allowance', qty: 1, rate: 90, total: 90 },
      { description: 'Admin / setup / disposal', qty: 1, rate: 200, total: 200 },
    ],
    subtotal: 640,
    gst: 0,
    total: 640,
  },
]
