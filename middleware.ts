import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/profile'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isOnboarding = pathname.startsWith('/onboarding');

  // Protected routes: dashboard, profile
  if (isProtected) {
    const privyToken = request.cookies.get('privy-token');

    if (!privyToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'required');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Onboarding route: require auth cookie
  if (isOnboarding) {
    const privyToken = request.cookies.get('privy-token');

    if (!privyToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'required');
      return NextResponse.redirect(url);
    }

    // Note: full onboarding_complete check cannot happen in edge middleware (no DB access).
    // The page itself handles the "already onboarded" redirect using useAuth hook.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/onboarding/:path*'],
};
