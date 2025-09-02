import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const { data: keyResult, error } = await supabase
    .from('key_results')
    .select(`
      *,
      objective:objectives!objective_id(id, title, session_id),
      owner:profiles!owner_id(id, full_name, email)
    `)
    .eq('id', resolvedParams.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!keyResult) {
    return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
  }

  return NextResponse.json({ keyResult })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { 
    title, 
    description, 
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

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (target_value !== undefined) updateData.target_value = target_value
  if (initial_value !== undefined) updateData.initial_value = initial_value
  if (current_value !== undefined) updateData.current_value = current_value
  if (unit !== undefined) updateData.unit = unit
  if (key_result_type !== undefined) updateData.key_result_type = key_result_type
  if (confidence_level !== undefined) updateData.confidence_level = confidence_level
  if (owner_id !== undefined) updateData.owner_id = owner_id
  if (deadline !== undefined) updateData.deadline = deadline
  if (tags !== undefined) updateData.tags = tags

  updateData.updated_at = new Date().toISOString()

  const resolvedParams = await params
  const { data: keyResult, error } = await supabase
    .from('key_results')
    .update(updateData)
    .eq('id', resolvedParams.id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const { error } = await supabase
    .from('key_results')
    .delete()
    .eq('id', resolvedParams.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}