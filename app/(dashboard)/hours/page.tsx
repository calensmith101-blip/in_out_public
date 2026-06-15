'use client'
import RecordList from '@/components/records/RecordList'
import { LABOUR_DISPLAY_FIELDS } from '@/lib/recordConfigs'
import { formatCurrency } from '@/lib/finance'

export default function Page() {
  return (
    <RecordList
      collection="labourEntries"
      singular="Labour Entry"
      label="Hours / Labour"
      newHref="/hours/new"
      editHref={id => `/hours/${id}`}
      displayFields={LABOUR_DISPLAY_FIELDS}
      sortField="date"
      formatValue={(field, val) => {
        if (field === 'totalCost') return val ? formatCurrency(val) : '—'
        if (field === 'totalHours') return val ? `${val}h` : '—'
        if (field === 'billable') return val ? '✓ Yes' : 'No'
        return val ?? '—'
      }}
      emptyMessage="No labour entries yet. Log your hours to track billable time."
    />
  )
}
