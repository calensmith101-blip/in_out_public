import WsJobForm from '@/components/workspace/WsJobForm'
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <WsJobForm wsId="my-business" id={id} /> }
