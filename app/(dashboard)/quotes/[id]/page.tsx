import QuoteForm from '@/components/quotes/QuoteForm'
export default async function Page({ params }: { params: Promise<{ id: string }> }){
  const { id } = await params
  return <QuoteForm wsId="my-business" id={id} />
}
