import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UsersRolesPage from '@/components/admin/UsersRolesPage'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return (
    <AuthenticatedLayout pageTitle="Users & Roles">
      <UsersRolesPage />
    </AuthenticatedLayout>
  )
}