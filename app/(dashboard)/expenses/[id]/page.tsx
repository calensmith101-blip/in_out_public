'use client'
import RecordForm from '@/components/records/RecordForm'
import { EXPENSE_FIELDS } from '@/lib/recordConfigs'
import { useParams } from 'next/navigation'
export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <RecordForm collection="expenses" singular="Expense" fields={EXPENSE_FIELDS} backHref="/expenses" id={id} />
}
