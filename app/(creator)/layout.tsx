'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Home, Upload, User, LogOut, Menu, X } from 'lucide-react'
import ProtectedRoute from '@/components/providers/PotectedRoute'
import Link from 'next/link'

export default function CreatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { name: 'Dashboard', icon: <Home size={20} />, href: '/dashboard' },
    { name: 'Upload', icon: <Upload size={20} />, href: '/dashboard/upload' },
    { name: 'Profile', icon: <User size={20} />, href: '/dashboard/profile' },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        {/* Mobile sidebar toggle */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-gray-800 rounded-lg"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-xl font-bold">Creator Dashboard</h1>
              <p className="text-sm text-gray-400">Welcome back, {user?.email?.split('@')[0]}</p>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* Sign out button */}
            <button
              onClick={signOut}
              className="mt-8 flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/30 text-red-400 w-full"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}