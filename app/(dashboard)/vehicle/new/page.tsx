'use client'
import RecordForm from '@/components/records/RecordForm'
import { VEHICLE_FIELDS } from '@/lib/recordConfigs'
export default function Page() {
  return <RecordForm collection="vehicleEntries" singular="Vehicle Entry" fields={VEHICLE_FIELDS} backHref="/vehicle" />
}
