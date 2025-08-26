'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Users, Mail, Settings, UserPlus } from 'lucide-react'
import InviteUsersModal from '@/components/admin/InviteUsersModal'

interface User {
  id: string
  full_name: string
  email: string
  roles: string[]
  title?: string
  created_at: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  invited_by: string
  created_at: string
  expires_at: string
}

export default function UsersRolesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check if current user is admin
  const isAdmin = currentUserRoles.includes('admin')

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, roles, title, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchPendingInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('id, email, role, invited_by, created_at, expires_at')
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingInvites(data || [])
    } catch (error) {
      console.error('Error fetching pending invites:', error)
    }
  }

  const getCurrentUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setCurrentUserRoles(data?.roles || [])
      }
    } catch (error) {
      console.error('Error fetching current user roles:', error)
    }
  }

  const handleInviteSuccess = () => {
    fetchPendingInvites()
    setShowInviteModal(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'user': return 'bg-blue-100 text-blue-800'
      case 'view_only': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  useEffect(() => {
    getCurrentUserRoles()
    fetchUsers()
    fetchPendingInvites()
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage organization members and their permissions
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Users
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {/* Pending Invites Section */}
            {pendingInvites.length > 0 && (
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Invites</h3>
                <div className="space-y-3">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                            <Mail className="h-5 w-5 text-yellow-600" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                          <p className="text-xs text-gray-500">
                            Invited {formatDate(invite.created_at)} • Expires {formatDate(invite.expires_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(invite.role)}`}>
                          {invite.role}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Users Section */}
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Members</h3>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name || 'No name provided'}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.title && (
                          <p className="text-xs text-gray-500">{user.title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                        >
                          {role}
                        </span>
                      ))}
                      <span className="text-xs text-gray-500">
                        Joined {formatDate(user.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <InviteUsersModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  )
}