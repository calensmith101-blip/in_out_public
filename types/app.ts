export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'datetime-local' | 'time' | 'textarea' | 'select' | 'checkbox'

export type FieldConfig = {
  name: string
  label: string
  type?: FieldType
  required?: boolean
  placeholder?: string
  options?: string[]
  defaultValue?: string | number | boolean
  group?: string
}

export type CollectionConfig = {
  collection: string
  label: string
  singular: string
  path: string
  description?: string
  fields: FieldConfig[]
  listFields: string[]
}

export type AppRecord = Record<string, any> & {
  id?: string
  createdAt?: any
  updatedAt?: any
}

// ── Job-centric types ──────────────────────────────────────────────────────────

export type JobStatus =
  | 'lead' | 'quoted' | 'approved' | 'in_progress'
  | 'invoiced' | 'paid' | 'complete' | 'cancelled'

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Job {
  id: string
  jobNumber?: string
  jobTitle: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  siteAddress?: string
  jobDescription?: string
  status: JobStatus
  priority: JobPriority
  startDate?: string
  dueDate?: string
  totalQuoted?: number
  totalInvoiced?: number
  totalPaid?: number
  totalMaterials?: number
  totalLabour?: number
  balanceDue?: number
  createdAt?: any
  updatedAt?: any
}

export interface JobQuote {
  id: string
  jobId: string
  quoteNumber?: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED'
  total?: number
  description?: string
  notes?: string
  createdAt?: any
  updatedAt?: any
}

export interface JobInvoice {
  id: string
  jobId: string
  invoiceNumber?: string
  invoiceDate?: string
  status: 'DRAFT' | 'SENT' | 'PART_PAID' | 'PAID' | 'VOID'
  total?: number
  amountPaid?: number
  balanceOwing?: number
  notes?: string
  createdAt?: any
  updatedAt?: any
}

export interface JobMaterial {
  id: string
  jobId: string
  name: string
  supplier?: string
  quantity?: number
  unitCost?: number
  totalCost?: number
  markupPercent?: number
  notes?: string
  createdAt?: any
  updatedAt?: any
}

export interface JobPayment {
  id: string
  jobId: string
  amount: number
  paymentDate?: string
  method?: string
  reference?: string
  notes?: string
  createdAt?: any
  updatedAt?: any
}

export interface JobLabour {
  id: string
  jobId: string
  description: string
  date?: string
  hours: number
  ratePerHour?: number
  totalCost?: number
  worker?: string
  notes?: string
  createdAt?: any
  updatedAt?: any
}

export interface JobEvent {
  id: string
  jobId: string
  content: string           // note text or event description
  eventType: 'note' | 'photo' | 'site_visit' | 'call' | 'other'
  photoUrl?: string
  createdAt?: any
  updatedAt?: any
}

export interface JobTask {
  id: string
  jobId: string
  title: string
  done: boolean
  dueDate?: string
  createdAt?: any
  updatedAt?: any
}

export type JobSubTab = 'overview' | 'quotes' | 'invoices' | 'materials' | 'labour' | 'events' | 'tasks'
