'use client'
import RecordForm from '@/components/records/RecordForm'
import { LABOUR_FIELDS } from '@/lib/recordConfigs'
export default function Page() {
  return <RecordForm collection="labourEntries" singular="Labour Entry" fields={LABOUR_FIELDS} backHref="/hours" />
}
