import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'd MMM yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'd MMM')
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'd MMM yyyy, h:mm a')
}

export const statusColor: Record<string, string> = {
  // Generic
  DRAFT:            'bg-wj-elevated text-wj-subtle border-wj-border',
  SENT:             'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACTIVE:           'bg-blue-500/10 text-blue-400 border-blue-500/20',
  NEW:              'bg-violet-500/10 text-violet-400 border-violet-500/20',
  REQUESTED:        'bg-violet-500/10 text-violet-400 border-violet-500/20',
  AWAITING_DETAILS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OFFERED_TIMES:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BOOKED:           'bg-green-500/10 text-green-400 border-green-500/20',
  COMPLETED:        'bg-green-500/10 text-green-400 border-green-500/20',
  COMPLETE:         'bg-green-500/10 text-green-400 border-green-500/20',
  PAID:             'bg-green-500/10 text-green-400 border-green-500/20',
  PART_PAID:        'bg-teal-500/10 text-teal-400 border-teal-500/20',
  ACCEPTED:         'bg-green-500/10 text-green-400 border-green-500/20',
  DECLINED:         'bg-red-500/10 text-red-400 border-red-500/20',
  LOST:             'bg-wj-elevated text-wj-muted border-wj-border',
  CANCELLED:        'bg-wj-elevated text-wj-muted border-wj-border',
  // Job statuses
  lead:             'bg-violet-500/10 text-violet-400 border-violet-500/20',
  quoted:           'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved:         'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  in_progress:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  invoiced:         'bg-orange-500/10 text-orange-400 border-orange-500/20',
  paid:             'bg-green-500/10 text-green-400 border-green-500/20',
  complete:         'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled:        'bg-zinc-700/30 text-zinc-500 border-zinc-600/20',
}

export const jobStatusLabel: Record<string, string> = {
  lead:        'Lead',
  quoted:      'Quoted',
  approved:    'Approved',
  in_progress: 'In Progress',
  invoiced:    'Invoiced',
  paid:        'Paid',
  complete:    'Complete',
  cancelled:   'Cancelled',
}

export const priorityColor: Record<string, string> = {
  low:    'bg-zinc-700/30 text-zinc-400 border-zinc-600/20',
  normal: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
}
