// middleware.ts (SIMPLE VERSION)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // ========== PHASE 1 CONFIGURATION ==========
  const APP_PHASE = process.env.NEXT_PUBLIC_APP_PHASE || 'portfolio_only'
  const IS_MARKETPLACE_LAUNCHED = APP_PHASE === 'marketplace'
  
  // ========== ALWAYS ALLOWED ROUTES ==========
  const alwaysAllowed = [
    '/',                    // Home page
    '/login',              // Login page
    '/signup',             // Signup page  
    '/creator/',           // Creator portfolio pages
    '/portfolio/',         // Portfolio detail pages
    '/api/',               // All API routes
    '/dashboard',          // Creator dashboard
    '/dashboard/',         // Dashboard subpages
    '/admin',              // Admin pages
    '/admin/',             // Admin subpages
    '/_next/',             // Next.js internal
    '/favicon.ico',        // Favicon
    '/coming-soon',        // Coming soon page
  ]

  const isAlwaysAllowed = alwaysAllowed.some(route => 
    pathname === route || pathname.startsWith(route)
  )

  if (isAlwaysAllowed) {
    return NextResponse.next()
  }

  // ========== STATIC FILES ==========
  const staticFilePatterns = [
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i,
    /\.(css|js|woff|woff2|ttf|eot)$/i,
  ]

  const isStaticFile = staticFilePatterns.some(pattern => 
    pattern.test(pathname)
  )

  if (isStaticFile) {
    return NextResponse.next()
  }

  // ========== MARKETPLACE ROUTES ==========
  const marketplaceRoutes = [
    '/browse',
    '/saved',
    '/liked',
    '/clients',
    '/messages',
    '/feed',
    '/discover',
    '/explore',
    '/search',
  ]

  const isMarketplaceRoute = marketplaceRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isMarketplaceRoute && !IS_MARKETPLACE_LAUNCHED) {
    // Redirect everyone to home page (or coming soon page)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Allow everything else
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}