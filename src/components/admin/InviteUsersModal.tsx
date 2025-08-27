'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Mail } from 'lucide-react'

interface InviteUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUsersModal({ isOpen, onClose, onSuccess }: InviteUsersModalProps) {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const validateEmails = (emailString: string): string[] => {
    const emailList = emailString
      .split(/[,\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails: string[] = []
    const invalidEmails: string[] = []

    emailList.forEach(email => {
      if (emailRegex.test(email)) {
        validEmails.push(email)
      } else {
        invalidEmails.push(email)
      }
    })

    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`)
    }

    return validEmails
  }

  const checkExistingUsers = async (emailList: string[]) => {
    const { data: existingUsers, error } = await supabase
      .from('profiles')
      .select('email')
      .in('email', emailList)

    if (error) throw error

    const existingEmails = existingUsers?.map(user => user.email) || []
    const newEmails = emailList.filter(email => !existingEmails.includes(email))

    if (existingEmails.length > 0) {
      throw new Error(`These users are already in your organization: ${existingEmails.join(', ')}`)
    }

    return newEmails
  }

  const checkPendingInvites = async (emailList: string[]) => {
    const { data: pendingInvites, error } = await supabase
      .from('user_invitations')
      .select('email')
      .in('email', emailList)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    if (error) throw error

    const pendingEmails = pendingInvites?.map(invite => invite.email) || []
    const newEmails = emailList.filter(email => !pendingEmails.includes(email))

    if (pendingEmails.length > 0) {
      throw new Error(`These users already have pending invites: ${pendingEmails.join(', ')}`)
    }

    return newEmails
  }

  const sendInvitations = async (emailList: string[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Authentication required')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new Error('User organization not found')
    }

    const invitations = emailList.map(email => ({
      email,
      organization_id: profile.organization_id,
      invited_by: user.id,
      role: role as 'admin' | 'user' | 'view_only'
    }))

    const { data: createdInvites, error } = await supabase
      .from('user_invitations')
      .insert(invitations)
      .select()

    if (error) throw error

    // TODO: Send actual email invitations here
    // For now, we'll just create the database records
    // In a real app, you'd integrate with an email service like SendGrid, Resend, etc.
    
    return createdInvites
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate email formats
      const emailList = validateEmails(emails)
      
      if (emailList.length === 0) {
        throw new Error('Please enter at least one email address')
      }

      // Check for existing users
      const newEmails = await checkExistingUsers(emailList)
      
      // Check for pending invites
      const finalEmails = await checkPendingInvites(newEmails)

      if (finalEmails.length === 0) {
        throw new Error('All provided email addresses are already users or have pending invites')
      }

      // Send invitations
      await sendInvitations(finalEmails)

      const successMessage = finalEmails.length === 1 
        ? `Invitation sent to ${finalEmails[0]}`
        : `Invitations sent to ${finalEmails.length} users`

      setSuccess(successMessage)
      setEmails('')
      setRole('user')
      
      // Close modal after success
      setTimeout(() => {
        onSuccess()
      }, 1500)

    } catch (err) {
      console.error('Invitation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Invite Users</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Enter one or more email addresses separated by a comma or space.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-1">
              Email Addresses *
            </label>
            <textarea
              id="emails"
              rows={3}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="example@mail.com, user@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="view_only">View Only</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Users can manage OKRs, Admins have full control, View Only can only view data
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Invite Users'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> Invited users will receive an email with a signup link that expires in 7 days. 
            They will appear as &quot;Pending&quot; until they complete registration.
          </p>
        </div>
      </div>
    </div>
  )
}