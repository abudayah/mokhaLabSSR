import { NextRequest, NextResponse } from "next/server"
import { fetchAuthSession } from "aws-amplify/auth/server"
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils"

/**
 * Protects /admin/* routes using the official Amplify Next.js adapter.
 * Uses runWithAmplifyServerContext + fetchAuthSession (server) to validate
 * the Cognito session from cookies — no manual cookie parsing needed.
 *
 * @see https://docs.amplify.aws/nextjs/build-a-backend/server-side-rendering/
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin routes — let /admin/login through
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const response = NextResponse.next()

    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: async (contextSpec) => {
        try {
          const session = await fetchAuthSession(contextSpec)
          // A valid session has tokens
          return session.tokens !== undefined
        } catch {
          return false
        }
      },
    })

    if (!authenticated) {
      const loginUrl = new URL("/admin/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Return the response so any refreshed tokens are set via Set-Cookie
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
