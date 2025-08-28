'use client'

import { useState } from 'react'
import { Home, Target, Calendar, Settings, Users, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  pageTitle?: string
}

export default function AuthenticatedLayout({ children, pageTitle }: AuthenticatedLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const pathname = usePathname()

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Objectives & Key Results', href: '/okrs', icon: Target },
    { name: 'Sessions', href: '/sessions', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Users & Roles', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div 
        className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0 ${
          sidebarExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-white" />
            </div>
            {sidebarExpanded && (
              <div className="ml-3 text-xl font-bold text-gray-900 whitespace-nowrap">OKR App</div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${sidebarExpanded ? '' : 'mx-auto'}`} />
                    {sidebarExpanded && (
                      <span className="ml-3 whitespace-nowrap">{item.name}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4">
            <Link
              href="/profile"
              className="group flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                CB
              </div>
              {sidebarExpanded && (
                <div className="ml-3 min-w-0">
                  <div className="text-gray-900 font-medium whitespace-nowrap">Chris Barney</div>
                  <div className="text-xs text-gray-500 truncate">cbarney6@gmail.com</div>
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area - Dynamically Adjusts */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {pageTitle || 'Dashboard'}
            </h1>
            
            <div className="flex items-center space-x-4">
              {/* Additional header content can go here */}
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}