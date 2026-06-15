import CrudForm from '@/components/firebase/CrudForm'
import { configs } from '@/lib/appConfig'
export default async function Page({ params }: { params: Promise<{ id: string }> }){ const { id } = await params; return <CrudForm config={configs.travelLogs} id={id} /> }
