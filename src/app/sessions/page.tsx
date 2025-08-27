import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SessionsTimelinePage from '@/components/sessions/SessionsTimelinePage'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return <SessionsTimelinePage />
}