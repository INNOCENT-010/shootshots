import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' 
import { AuthProvider } from '@/components/providers/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shootshots - Discover Photographers & Videographers',
  description: 'Platform to discover and connect with photographers and videographers',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
