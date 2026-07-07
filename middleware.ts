import { NextRequest, NextResponse } from 'next/server'

// Optional password gate for deployed planners (e.g. Vercel).
// Set APP_PASSWORD to require it; leave unset for local use.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD
  if (!password) return NextResponse.next()

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6))
    const pass = decoded.slice(decoded.indexOf(':') + 1)
    if (pass === password) return NextResponse.next()
  }

  return new NextResponse('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="IG Grid Planner"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons/|manifest.json|favicon.ico).*)'],
}
