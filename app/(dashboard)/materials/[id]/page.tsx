import RecordForm from '@/components/records/RecordForm'
import { MATERIAL_FIELDS } from '@/lib/recordConfigs'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RecordForm collection="materials" singular="Material" fields={MATERIAL_FIELDS} backHref="/materials" id={id} />
}
