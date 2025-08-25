import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AuthButton from '@/components/auth/AuthButton'
import SessionsList from '@/components/sessions/SessionsList'

type SupabaseClient = ReturnType<typeof createServerClient>

async function getStats(supabase: SupabaseClient, organizationId: string) {
  // Get objectives count
  const { data: objectives } = await supabase
    .from('objectives')
    .select('id')
    .eq('organization_id', organizationId)

  // Get active key results count
  const { data: keyResults } = await supabase
    .from('key_results')
    .select('id')
    .eq('organization_id', organizationId)

  // Placeholder calculations for now (will be replaced with real data)
  const completionRate = 85
  const onTrack = 12
  const atRisk = 3
  const overdue = 1

  return {
    totalObjectives: objectives?.length || 0,
    activeKeyResults: keyResults?.length || 0,
    completionRate,
    onTrack,
    atRisk,
    overdue
  }
}

export default async function Dashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/')
  }

  // Get user's profile and organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  let organizationId = profile?.organization_id

  // If no organization, create one
  if (!organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({
        name: `${user.email?.split('@')[0]}'s Organization`,
        created_by: user.id
      })
      .select()
      .single()

    if (orgData) {
      organizationId = orgData.id
      
      // Update profile with organization
      await supabase
        .from('profiles')
        .update({ organization_id: organizationId })
        .eq('id', user.id)
    }
  }

  const stats = organizationId ? await getStats(supabase, organizationId) : {
    totalObjectives: 0,
    activeKeyResults: 0,
    completionRate: 0,
    onTrack: 0,
    atRisk: 0,
    overdue: 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* User Avatar */}
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-gray-700 font-medium">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
            </div>
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - 6 Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Objectives</h3>
            <p className="text-2xl font-semibold text-blue-600">{stats.totalObjectives}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Key Results</h3>
            <p className="text-2xl font-semibold text-green-600">{stats.activeKeyResults}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Completion Rate</h3>
            <p className="text-2xl font-semibold text-purple-600">{stats.completionRate}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">On Track</h3>
            <p className="text-2xl font-semibold text-emerald-600">{stats.onTrack}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">At Risk</h3>
            <p className="text-2xl font-semibold text-orange-600">{stats.atRisk}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Overdue</h3>
            <p className="text-2xl font-semibold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Sessions Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
            </div>
            <SessionsList />
          </div>
        </div>
      </div>
    </div>
  )
}