import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
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
    return NextResponse.json({ error: 'User not associated with organization' }, { status: 400 })
  }

  const { data: objectives, error } = await supabase
    .from('objectives')
    .select(`
      *,
      owner:profiles!owner_id(id, full_name, email),
      session:sessions!session_id(id, name, color, status),
      parent_objective:objectives!parent_objective_id(id, title),
      parent_key_result:key_results!parent_key_result_id(id, title)
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Objectives GET API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ objectives: objectives || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'User must be part of an organization' }, { status: 400 })
  }

  const body = await request.json()
  const { 
    title, 
    description, 
    session_id, 
    owner_id, 
    parent_objective_id, 
    parent_key_result_id,
    tags = [],
    okr_design_score = 0
  } = body

  if (!title || !session_id || !owner_id) {
    return NextResponse.json({ error: 'Title, session_id, and owner_id are required' }, { status: 400 })
  }

  // Get session dates to use for the objective
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('start_date, end_date')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 400 })
  }

  const { data: objective, error } = await supabase
    .from('objectives')
    .insert({
      title,
      description,
      session_id,
      owner_id,
      parent_objective_id,
      parent_key_result_id,
      organization_id: profile.organization_id,
      start_date: session.start_date,
      end_date: session.end_date,
      tags,
      okr_design_score,
      status: 'active'
    })
    .select(`
      *,
      owner:profiles!owner_id(id, full_name, email),
      session:sessions!session_id(id, name, color, status)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ objective })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'User not associated with organization' }, { status: 400 })
  }

  const body = await request.json()
  const {
    id,
    title,
    description,
    session_id,
    owner_id,
    parent_objective_id,
    parent_key_result_id,
    tags,
    okr_design_score,
    status
  } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing objective ID' }, { status: 400 })
  }

  const { data: objective, error } = await supabase
    .from('objectives')
    .update({
      title,
      description,
      session_id,
      owner_id,
      parent_objective_id: parent_objective_id || null,
      parent_key_result_id: parent_key_result_id || null,
      tags: tags || [],
      okr_design_score: okr_design_score || 0,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .select(`
      *,
      owner:profiles!owner_id(id, full_name, email),
      session:sessions!session_id(id, name, color, status)
    `)
    .single()

  if (error) {
    console.error('Error updating objective:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!objective) {
    return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
  }

  return NextResponse.json({ objective })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'User not associated with organization' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing objective ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('objectives')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    console.error('Error deleting objective:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Objective deleted successfully' })
}