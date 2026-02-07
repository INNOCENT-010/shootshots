'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Home, Upload, User, LogOut, Menu, X, Camera } from 'lucide-react'
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
    { name: 'Upload', icon: <Upload size={20} />, href: '/upload' },
    { name: 'Profile', icon: <User size={20} />, href: '/dashboard/profile' },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white text-gray-900">
        {/* Mobile sidebar toggle */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-green-900 text-white rounded-lg"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 
          transform transition-transform duration-200 ease-in-out shadow-lg
          lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 h-full flex flex-col">
            {/* Logo */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="text-green-700" size={24} />
                <h1 className="text-xl font-bold text-gray-900">Creator Studio</h1>
              </div>
              <p className="text-sm text-gray-600">Welcome back, {user?.email?.split('@')[0]}</p>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900"
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
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-700 border border-red-200 hover:border-red-300 w-full transition-colors mt-4"
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
              className="fixed inset-0 bg-black/30 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* DARK GREEN HEADER */}
          <header className="sticky top-0 z-20 border-b border-green-800 bg-green-900/95 backdrop-blur-sm">
            <div className="px-4 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="lg:hidden">
                  <h2 className="text-lg font-bold text-white">Creator Dashboard</h2>
                </div>
                <div className="hidden lg:block">
                  <h2 className="text-lg font-bold text-white">Creator Dashboard</h2>
                  <p className="text-sm text-green-200">Manage your portfolio and content</p>
                </div>
                <div className="text-sm text-green-200 hidden lg:block">
                  {user?.email}
                </div>
              </div>
            </div>
          </header>
          
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
