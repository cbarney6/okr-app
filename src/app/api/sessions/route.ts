import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      *,
      parent_session:sessions!parent_session_id(id, name),
      child_sessions:sessions!parent_session_id(count)
    `)
    .order('start_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's profile and organization
  let { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(*)')
    .eq('id', user.id)
    .single()

  // If user has no organization, create one
  if (!profile?.organization_id) {
    // Create a default organization for the user
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: `${user.email?.split('@')[0] || 'My'} Organization`,
        slug: `${user.email?.split('@')[0] || 'my'}-org-${Date.now()}`
      })
      .select()
      .single()

    if (orgError) {
      return NextResponse.json({ error: 'Failed to create organization: ' + orgError.message }, { status: 500 })
    }

    // Update user profile with new organization
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: newOrg.id })
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ error: 'Failed to update profile: ' + profileError.message }, { status: 500 })
    }

    profile = { organization_id: newOrg.id, organizations: newOrg }
  }

  const body = await request.json()
  const { name, description, start_date, end_date, parent_session_id, color, cadence, cadence_day } = body

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      name,
      description,
      start_date,
      end_date,
      parent_session_id,
      organization_id: profile.organization_id,
      color: color || '#3B82F6',
      cadence: cadence || 'weekly',
      cadence_day: cadence_day || 'monday'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session })
}