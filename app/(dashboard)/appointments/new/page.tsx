import CrudForm from '@/components/firebase/CrudForm'
import { configs } from '@/lib/appConfig'
export default function Page(){ return <CrudForm config={configs.appointments} /> }
