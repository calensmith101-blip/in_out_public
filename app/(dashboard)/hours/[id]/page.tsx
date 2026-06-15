'use client'
import RecordForm from '@/components/records/RecordForm'
import { LABOUR_FIELDS } from '@/lib/recordConfigs'
import { useParams } from 'next/navigation'
export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <RecordForm collection="labourEntries" singular="Labour Entry" fields={LABOUR_FIELDS} backHref="/hours" id={id} />
}
