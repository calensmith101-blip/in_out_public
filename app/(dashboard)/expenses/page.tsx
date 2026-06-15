'use client'
import RecordList from '@/components/records/RecordList'
import { EXPENSE_DISPLAY_FIELDS } from '@/lib/recordConfigs'
import { formatCurrency } from '@/lib/finance'

export default function Page() {
  return (
    <RecordList
      collection="expenses"
      singular="Expense"
      label="Expenses"
      newHref="/expenses/new"
      editHref={id => `/expenses/${id}`}
      displayFields={EXPENSE_DISPLAY_FIELDS}
      sortField="date"
      formatValue={(field, val) => {
        if (field === 'amount') return val ? formatCurrency(val) : '—'
        if (field === 'taxDeductible') return val ? '✓ Yes' : 'No'
        return val ?? '—'
      }}
      emptyMessage="No expenses yet. Track deductible costs here."
    />
  )
}
