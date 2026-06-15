import CrudList from '@/components/firebase/CrudList'
import { configs } from '@/lib/appConfig'
export default function Page(){ return <CrudList config={configs.leads} /> }
