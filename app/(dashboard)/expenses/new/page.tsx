'use client'
import RecordForm from '@/components/records/RecordForm'
import { EXPENSE_FIELDS } from '@/lib/recordConfigs'
export default function Page() {
  return <RecordForm collection="expenses" singular="Expense" fields={EXPENSE_FIELDS} backHref="/expenses" />
}
