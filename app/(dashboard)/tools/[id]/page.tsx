'use client'
import RecordForm from '@/components/records/RecordForm'
import { TOOL_FIELDS } from '@/lib/recordConfigs'
import { useParams } from 'next/navigation'
export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <RecordForm collection="toolEntries" singular="Tool" fields={TOOL_FIELDS} backHref="/tools" id={id} />
}
