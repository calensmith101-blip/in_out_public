'use client'

import RecordList from '@/components/records/RecordList'
import { MATERIAL_DISPLAY_FIELDS } from '@/lib/recordConfigs'

export default function Page() {
  return (
    <RecordList
      collection="materials"
      singular="Material"
      label="Materials"
      newHref="/materials/new"
      editHref={(id) => `/materials/${id}`}
      displayFields={MATERIAL_DISPLAY_FIELDS}
      badgeField="workspaceId"
    />
  )
}
