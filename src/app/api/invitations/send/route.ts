import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invitationIds } = await request.json()

    if (!invitationIds || !Array.isArray(invitationIds)) {
      return NextResponse.json({ error: 'Invalid invitation IDs' }, { status: 400 })
    }

    // Get invitation details
    const { data: invitations, error: invError } = await supabase
      .from('user_invitations')
      .select(`
        *,
        organizations (name),
        profiles!user_invitations_invited_by_fkey (full_name)
      `)
      .in('id', invitationIds)

    if (invError || !invitations) {
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Send invitation emails using Supabase Auth
    const emailPromises = invitations.map(async (invitation) => {
      const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin')}/signup?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}&org=${encodeURIComponent(invitation.organizations.name)}`
      
      // Use Supabase's built-in email functionality
      // Note: In production, you might want to use a service like Resend, SendGrid, etc.
      const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(invitation.email, {
        data: {
          organization_id: invitation.organization_id,
          invitation_token: invitation.token,
          invited_by: invitation.invited_by,
          role: invitation.role
        },
        redirectTo: inviteUrl
      })

      if (emailError) {
        console.error(`Failed to send email to ${invitation.email}:`, emailError)
        return { email: invitation.email, success: false, error: emailError.message }
      }

      return { email: invitation.email, success: true }
    })

    const results = await Promise.all(emailPromises)
    const failedEmails = results.filter(r => !r.success)

    if (failedEmails.length > 0) {
      return NextResponse.json({
        warning: `Some invitations failed to send`,
        failed: failedEmails,
        successful: results.filter(r => r.success)
      }, { status: 207 })
    }

    return NextResponse.json({ 
      message: 'All invitations sent successfully',
      results 
    })

  } catch (error) {
    console.error('Send invitations error:', error)
    return NextResponse.json({ 
      error: 'Failed to send invitations' 
    }, { status: 500 })
  }
}