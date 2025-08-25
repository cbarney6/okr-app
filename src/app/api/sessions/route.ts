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

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const body = await request.json()
  const { name, description, start_date, end_date, parent_session_id, color, cadence } = body

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
      cadence: cadence || 'weekly'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session })
}