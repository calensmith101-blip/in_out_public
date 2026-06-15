'use client'
import RecordForm from '@/components/records/RecordForm'
import { VEHICLE_FIELDS } from '@/lib/recordConfigs'
import { useParams } from 'next/navigation'
export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <RecordForm collection="vehicleEntries" singular="Vehicle Entry" fields={VEHICLE_FIELDS} backHref="/vehicle" id={id} />
}
