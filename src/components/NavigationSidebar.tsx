'use client'

import { useState } from 'react'
import { Home, Target, Calendar, Settings, Users, BarChart3, Menu, X } from 'lucide-react'

interface NavigationSidebarProps {
  currentPage?: string
}

export default function NavigationSidebar({ currentPage = 'dashboard' }: NavigationSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'okrs', label: 'My OKRs', icon: Target, href: '/okrs', hasSubmenu: true },
    { id: 'sessions', label: 'Sessions', icon: Calendar, href: '/sessions' },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
    { id: 'users', label: 'Users & Roles', icon: Users, href: '/users' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md border"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">OKR App</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                    {item.hasSubmenu && (
                      <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        14
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
              CB
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Chris Barney</p>
              <p className="text-xs text-gray-500">cbarney6@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}