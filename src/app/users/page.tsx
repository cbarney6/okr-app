import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UsersRolesPage from '@/components/admin/UsersRolesPage'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  const hasAdminRole = profile?.roles?.includes('admin') || false

  return <UsersRolesPage />
}