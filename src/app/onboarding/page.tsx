import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingComponent from '@/components/auth/OnboardingComponent'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check if user already has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile) {
    redirect('/dashboard')
  }

  // Get user metadata from auth
  const metadata = user.user_metadata || {}

  return <OnboardingComponent 
    userId={user.id} 
    email={user.email!}
    prefilledData={metadata}
  />
}