import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const objective_id = searchParams.get('objective_id')

  let query = supabase
    .from('key_results')
    .select(`
      *,
      objective:objectives!objective_id(id, title, session_id),
      owner:profiles!owner_id(id, full_name, email)
    `)
    .eq('organization_id', profile.organization_id)

  if (objective_id) {
    query = query.eq('objective_id', objective_id)
  }

  const { data: keyResults, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keyResults })
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
    objective_id,
    target_value,
    initial_value = 0,
    current_value = 0,
    unit = 'number',
    key_result_type = 'should_increase_to',
    confidence_level = 'medium',
    owner_id,
    deadline,
    tags = []
  } = body

  if (!title || !objective_id || target_value === undefined || !owner_id) {
    return NextResponse.json({ 
      error: 'Title, objective_id, target_value, and owner_id are required' 
    }, { status: 400 })
  }

  const { data: keyResult, error } = await supabase
    .from('key_results')
    .insert({
      title,
      description,
      objective_id,
      target_value,
      initial_value,
      current_value,
      unit,
      key_result_type,
      confidence_level,
      owner_id,
      deadline,
      tags,
      organization_id: profile.organization_id
    })
    .select(`
      *,
      objective:objectives!objective_id(id, title, session_id),
      owner:profiles!owner_id(id, full_name, email)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keyResult })
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
    objective_id,
    target_value,
    initial_value,
    current_value,
    unit,
    key_result_type,
    confidence_level,
    owner_id,
    deadline,
    tags
  } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing key result ID' }, { status: 400 })
  }

  const { data: keyResult, error } = await supabase
    .from('key_results')
    .update({
      title,
      description,
      objective_id,
      target_value,
      initial_value,
      current_value,
      unit,
      key_result_type,
      confidence_level,
      owner_id,
      deadline,
      tags: tags || [],
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .select(`
      *,
      objective:objectives!objective_id(id, title, session_id),
      owner:profiles!owner_id(id, full_name, email)
    `)
    .single()

  if (error) {
    console.error('Error updating key result:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!keyResult) {
    return NextResponse.json({ error: 'Key result not found' }, { status: 404 })
  }

  return NextResponse.json({ keyResult })
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
    return NextResponse.json({ error: 'Missing key result ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('key_results')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    console.error('Error deleting key result:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Key result deleted successfully' })
}