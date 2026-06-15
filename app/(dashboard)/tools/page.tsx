'use client'
import RecordList from '@/components/records/RecordList'
import { TOOL_DISPLAY_FIELDS } from '@/lib/recordConfigs'
import { formatCurrency } from '@/lib/finance'

export default function Page() {
  return (
    <RecordList
      collection="toolEntries"
      singular="Tool"
      label="Tools & Equipment"
      newHref="/tools/new"
      editHref={id => `/tools/${id}`}
      displayFields={TOOL_DISPLAY_FIELDS}
      sortField="datePurchased"
      formatValue={(field, val) => {
        if (field === 'cost') return val ? formatCurrency(val) : '—'
        if (field === 'taxDeductible' || field === 'receiptAttached') return val ? '✓' : '—'
        return val ?? '—'
      }}
      emptyMessage="No tools recorded yet. Track your equipment for tax deductions."
    />
  )
}
