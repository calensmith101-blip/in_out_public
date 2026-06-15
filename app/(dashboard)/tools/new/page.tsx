'use client'
import RecordForm from '@/components/records/RecordForm'
import { TOOL_FIELDS } from '@/lib/recordConfigs'
export default function Page() {
  return <RecordForm collection="toolEntries" singular="Tool" fields={TOOL_FIELDS} backHref="/tools" />
}
