import RecordForm from '@/components/records/RecordForm'
import { MATERIAL_FIELDS } from '@/lib/recordConfigs'

export default function Page() {
  return <RecordForm collection="materials" singular="Material" fields={MATERIAL_FIELDS} backHref="/materials" />
}
