import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SignupComponent from '@/components/auth/SignupComponent'

interface SignupPageProps {
  searchParams: Promise<{
    token?: string
    email?: string
    org?: string
  }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const invitationToken = params.token
  const prefilledEmail = params.email
  const prefilledOrganization = params.org

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }>
        <SignupComponent 
          invitationToken={invitationToken}
          prefilledEmail={prefilledEmail}
          prefilledOrganization={prefilledOrganization}
        />
      </Suspense>
    </div>
  )
}