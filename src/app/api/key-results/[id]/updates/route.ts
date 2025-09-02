import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const keyResultId = id

  // Verify key result exists and belongs to user's organization
  const { data: keyResult } = await supabase
    .from('key_results')
    .select('id, organization_id')
    .eq('id', keyResultId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!keyResult) {
    return NextResponse.json({ error: 'Key result not found' }, { status: 404 })
  }

  // Get check-ins for this key result
  const { data: updates, error } = await supabase
    .from('check_ins')
    .select(`
      *,
      user:profiles!user_id(id, full_name, email)
    `)
    .eq('key_result_id', keyResultId)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching key result updates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updates: updates || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const keyResultId = id
  const body = await request.json()
  const { value, notes, confidence_level } = body

  if (value === undefined) {
    return NextResponse.json({ error: 'Value is required for update' }, { status: 400 })
  }

  // Verify key result exists and belongs to user's organization
  const { data: keyResult } = await supabase
    .from('key_results')
    .select('id, organization_id, current_value')
    .eq('id', keyResultId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!keyResult) {
    return NextResponse.json({ error: 'Key result not found' }, { status: 404 })
  }

  // Create check-in record
  const { data: checkIn, error: checkInError } = await supabase
    .from('check_ins')
    .insert({
      key_result_id: keyResultId,
      organization_id: profile.organization_id,
      user_id: user.id,
      value: parseFloat(value),
      notes: notes || null
    })
    .select(`
      *,
      user:profiles!user_id(id, full_name, email)
    `)
    .single()

  if (checkInError) {
    console.error('Error creating check-in:', checkInError)
    return NextResponse.json({ error: checkInError.message }, { status: 500 })
  }

  // Update key result's current value
  const { error: updateError } = await supabase
    .from('key_results')
    .update({
      current_value: parseFloat(value),
      confidence_level: confidence_level || 'medium',
      updated_at: new Date().toISOString()
    })
    .eq('id', keyResultId)
    .eq('organization_id', profile.organization_id)

  if (updateError) {
    console.error('Error updating key result:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ checkIn }, { status: 201 })
}