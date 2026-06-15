import { NextResponse, type NextRequest } from 'next/server'

// Firebase Auth is handled on the client by components/auth/AuthGate.tsx.
// This middleware intentionally does not use Supabase or require Supabase env vars.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
