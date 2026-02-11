// app/(client)/browse/page.tsx - SIMPLE REDIRECT
import { redirect } from 'next/navigation'

// Check environment variable
const APP_PHASE = process.env.NEXT_PUBLIC_APP_PHASE || 'portfolio_only'

export default function BrowsePage() {
  // Always redirect during portfolio-only phase
  if (APP_PHASE !== 'marketplace') {
    redirect('/')
  }
  
  // When ready for marketplace, swap this file with your backup
  // For now, show a placeholder
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Marketplace Coming Soon</h1>
        <p className="text-gray-600">Browse feature will be available soon!</p>
      </div>
    </div>
  )
}