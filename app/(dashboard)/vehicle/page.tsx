'use client'
import RecordList from '@/components/records/RecordList'
import { VEHICLE_DISPLAY_FIELDS } from '@/lib/recordConfigs'
import { formatCurrency } from '@/lib/finance'

export default function Page() {
  return (
    <RecordList
      collection="vehicleEntries"
      singular="Vehicle Entry"
      label="Vehicle / Car Log"
      newHref="/vehicle/new"
      editHref={id => `/vehicle/${id}`}
      displayFields={VEHICLE_DISPLAY_FIELDS}
      sortField="date"
      formatValue={(field, val) => {
        if (['fuelCost','parking','repairs','servicing','rego','insurance'].includes(field)) return val ? formatCurrency(val) : '—'
        if (field === 'kilometres') return val ? `${val} km` : '—'
        return val ?? '—'
      }}
      emptyMessage="No vehicle entries. Log trips and costs for your tax records."
    />
  )
}
