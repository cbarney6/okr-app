'use client'

import { useState } from 'react'
import { Home, Target, Calendar, Settings, Users, BarChart3, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface NavigationSidebarProps {
  currentPage?: string
}

export default function NavigationSidebar({ currentPage = 'dashboard' }: NavigationSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'okrs', label: 'My OKRs', icon: Target, href: '/okrs', badge: '14' },
    { id: 'sessions', label: 'Sessions', icon: Calendar, href: '/sessions' },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
    { id: 'users', label: 'Users & Roles', icon: Users, href: '/users' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  ]

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header with logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className={`text-lg font-semibold text-gray-900 transition-all duration-300 ${
            isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
          }`}>
            OKR App
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={item.id === 'dashboard'}
              className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${
                isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'
              }`} />
              
              <span className={`ml-3 transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}>
                {item.label}
              </span>
              
              {item.badge && isExpanded && (
                <span className={`ml-auto text-xs px-2 py-1 rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile Section - Fixed at bottom */}
      <div 
        className="border-t border-gray-200 p-3 relative"
        onMouseEnter={() => setShowUserMenu(true)}
        onMouseLeave={() => setShowUserMenu(false)}
      >
        <div className="flex items-center space-x-3 relative">
          <div 
            className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 cursor-pointer hover:bg-yellow-600 transition-colors"
            title=""
          >
            CB
          </div>
          <div className={`transition-all duration-300 ${
            isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
          }`}>
            <p className="text-sm font-medium text-gray-900">Chris Barney</p>
            <p className="text-xs text-gray-500">cbarney6@gmail.com</p>
          </div>
        </div>
        
        {/* Hover Menu - positioned outside the flex container */}
        {showUserMenu && (
          <div 
            className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
            style={{ zIndex: 9999 }}
          >
            <button
              onClick={() => router.push('/profile')}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <User className="h-4 w-4 mr-3" />
              Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}