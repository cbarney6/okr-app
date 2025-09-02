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
  const { data: objective, error } = await supabase
    .from('objectives')
    .select(`
      *,
      owner:profiles!owner_id(id, full_name, email),
      session:sessions!session_id(id, name, color, status),
      parent_objective:objectives!parent_objective_id(id, title),
      parent_key_result:key_results!parent_key_result_id(id, title),
      key_results:key_results(
        id,
        title,
        description,
        target_value,
        current_value,
        initial_value,
        unit,
        key_result_type,
        confidence_level,
        deadline,
        tags,
        owner:profiles!owner_id(id, full_name, email)
      )
    `)
    .eq('id', resolvedParams.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!objective) {
    return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
  }

  // Calculate progress percentage for the objective based on key results
  let progressPercentage = 0
  
  if (objective.key_results && objective.key_results.length > 0) {
    const totalProgress = objective.key_results.reduce((sum: number, kr: Record<string, unknown>) => {
      let krProgress = 0
      const currentValue = Number(kr.current_value) || 0
      const initialValue = Number(kr.initial_value) || 0
      const targetValue = Number(kr.target_value) || 0
      
      switch (kr.key_result_type) {
        case 'should_increase_to':
          if (targetValue !== initialValue) {
            krProgress = Math.min(100, Math.max(0, 
              ((currentValue - initialValue) / (targetValue - initialValue)) * 100
            ))
          }
          break
        case 'should_decrease_to':
          if (initialValue !== targetValue) {
            krProgress = Math.min(100, Math.max(0, 
              ((initialValue - currentValue) / (initialValue - targetValue)) * 100
            ))
          }
          break
        case 'should_stay_above':
          krProgress = currentValue >= targetValue ? 100 : 0
          break
        case 'should_stay_below':
          krProgress = currentValue <= targetValue ? 100 : 0
          break
        case 'achieved_or_not':
          krProgress = currentValue >= targetValue ? 100 : 0
          break
        default:
          krProgress = 0
      }
      
      return sum + krProgress
    }, 0)
    
    progressPercentage = Math.round(totalProgress / objective.key_results.length)
  }

  const objectiveWithProgress = {
    ...objective,
    progress_percentage: progressPercentage
  }

  return NextResponse.json({ objective: objectiveWithProgress })
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
    session_id,
    owner_id, 
    parent_objective_id, 
    parent_key_result_id,
    tags,
    okr_design_score,
    status
  } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (session_id !== undefined) updateData.session_id = session_id
  if (owner_id !== undefined) updateData.owner_id = owner_id
  if (parent_objective_id !== undefined) updateData.parent_objective_id = parent_objective_id
  if (parent_key_result_id !== undefined) updateData.parent_key_result_id = parent_key_result_id
  if (tags !== undefined) updateData.tags = tags
  if (okr_design_score !== undefined) updateData.okr_design_score = okr_design_score
  if (status !== undefined) updateData.status = status

  updateData.updated_at = new Date().toISOString()

  const resolvedParams = await params
  const { data: objective, error } = await supabase
    .from('objectives')
    .update(updateData)
    .eq('id', resolvedParams.id)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const { error } = await supabase
    .from('objectives')
    .delete()
    .eq('id', resolvedParams.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}