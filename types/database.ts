// Auto-generated types matching the Supabase schema

export type JobStatus = 'ACTIVE' | 'QUOTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETE' | 'FINALISED' | 'CANCELLED'
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'DUE_SOON' | 'OVERDUE' | 'PAID' | 'PART_PAID' | 'CANCELLED'
export type LeadStatus = 'NEW' | 'WAITING' | 'QUOTED' | 'BOOKED' | 'COMPLETED' | 'INVOICED' | 'PAID' | 'LOST'
export type LeadUrgency = 'LOW' | 'MEDIUM' | 'HIGH'
export type MaterialStatus = 'REQUIRED' | 'ORDERED' | 'PURCHASED'
export type AppointmentStatus = 'REQUESTED' | 'AWAITING_DETAILS' | 'OFFERED_TIMES' | 'BOOKED' | 'COMPLETED' | 'CANCELLED'
export type ExpenseType = 'INCOME' | 'EXPENSE'

export interface Customer {
  id: string
  user_id: string
  name: string
  phone: string
  email: string
  address: string
  suburb: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  user_id: string
  job_number: string
  client_name: string
  client_phone: string
  client_email: string
  job_title: string
  address: string
  status: JobStatus
  notes: string
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  user_id: string
  quote_number: string
  job_number: string
  status: QuoteStatus
  date: string
  valid_until: string
  client_name: string
  client_address: string
  client_email: string
  client_phone: string
  scope_of_works: string
  materials_estimate: number
  labour_estimate: number
  travel_callout: number
  gst_enabled: boolean
  gst_amount: number
  subtotal: number
  total: number
  terms: string
  disclaimer: string
  notes: string
  created_at: string
  updated_at: string
  items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  user_id: string
  quote_id: string
  description: string
  quantity: number
  unit_cost: number
  total: number
  sort_order: number
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  job_number: string
  status: InvoiceStatus
  invoice_date: string
  due_date: string
  client_name: string
  client_address: string
  client_email: string
  client_phone: string
  gst_enabled: boolean
  gst_amount: number
  subtotal: number
  total: number
  amount_paid: number
  balance_owing: number
  payment_instructions: string
  notes: string
  converted_from_quote: string | null
  created_at: string
  updated_at: string
  items?: InvoiceItem[]
  payments?: InvoicePayment[]
}

export interface InvoiceItem {
  id: string
  user_id: string
  invoice_id: string
  description: string
  quantity: number
  unit_cost: number
  total: number
  sort_order: number
  created_at: string
}

export interface InvoicePayment {
  id: string
  user_id: string
  invoice_id: string
  invoice_number: string
  job_number: string
  customer_name: string
  amount: number
  payment_date: string   // ACTUAL received date — used for Finance & Tax
  payment_method: string
  notes: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  date: string
  job_number: string | null
  type: ExpenseType
  category: string
  description: string
  amount: number
  payment_method: string
  notes: string
  created_at: string
}

export interface Material {
  id: string
  user_id: string
  job_number: string
  item: string
  quantity: number
  unit_cost: number
  supplier: string
  status: MaterialStatus
  markup: number
  notes: string
  created_at: string
}

export interface TravelLog {
  id: string
  user_id: string
  date: string
  job_number: string
  from_location: string
  to_location: string
  start_km: number
  end_km: number
  distance_km: number
  parking_cost: number
  tolls_cost: number
  notes: string
  created_at: string
}

export interface Receipt {
  id: string
  user_id: string
  date: string
  supplier: string
  amount: number
  category: string
  job_number: string | null
  image_url: string | null
  notes: string
  created_at: string
}

export interface Lead {
  id: string
  user_id: string
  name: string
  phone: string
  address: string
  suburb: string
  description: string
  urgency: LeadUrgency
  preferred_times: string
  notes: string
  status: LeadStatus
  last_ai_reply: string
  linked_job_number: string | null
  linked_quote_id: string | null
  linked_invoice_id: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  user_id: string
  customer_name: string
  customer_phone: string
  address: string
  suburb: string
  job_description: string
  notes: string
  start_time: string
  end_time: string
  travel_buffer_mins: number
  status: AppointmentStatus
  linked_lead_id: string | null
  linked_job_number: string | null
  linked_quote_id: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface AIRoughQuote {
  id: string
  user_id: string
  description: string
  image_url: string | null
  ai_response: AIQuoteResponse | null
  estimate_low: number | null
  estimate_high: number | null
  labour_notes: string
  materials_notes: string
  risks: string
  questions: string
  client_message: string
  status: string
  converted_to_quote: string | null
  created_at: string
}

export interface AIQuoteResponse {
  estimate_low: number
  estimate_high: number
  labour_notes: string
  materials_notes: string
  risks: string[]
  questions: string[]
  client_message: string
}

export interface BusinessSettings {
  id: string
  user_id: string
  business_name: string
  owner_name: string
  abn: string
  phone: string
  email: string
  website: string
  address: string
  default_invoice_terms: string
  default_quote_disclaimer: string
  gst_enabled: boolean
  tax_set_aside_pct: number
  ato_km_rate: number
  next_job_seq: number
  next_quote_seq: number
  next_invoice_seq: number
  openai_api_key: string
  auto_reply_mode: string
  created_at: string
  updated_at: string
}

export interface WorkingHours {
  id: string
  user_id: string
  monday_enabled: boolean
  tuesday_enabled: boolean
  wednesday_enabled: boolean
  thursday_enabled: boolean
  friday_enabled: boolean
  saturday_enabled: boolean
  sunday_enabled: boolean
  day_start_time: string
  day_end_time: string
  lunch_start: string
  lunch_end: string
  quote_duration_mins: number
  travel_buffer_mins: number
  max_quotes_per_day: number
  blocked_dates: string[]
  updated_at: string
}
