import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import type { DefaultSession, NextAuthConfig } from 'next-auth'

type AuthRuntimeError = Error & {
  type?: string
  cause?: {
    err?: Error
  }
}

let lastAuthError = ''

function recordAuthError(error: Error) {
  const authError = error as AuthRuntimeError
  lastAuthError = JSON.stringify({
    name: authError.name,
    type: authError.type,
    message: authError.message,
    causeName: authError.cause?.err?.name,
    causeMessage: authError.cause?.err?.message,
  })
}

declare module 'next-auth' {
  interface Session {
    user: {
      accessToken?: string
    } & DefaultSession['user']
  }
  interface JWT {
    accessToken?: string
  }
  interface User {
    accessToken?: string
  }
}

const config = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: 'repo' }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.accessToken = token.accessToken as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.GITHUB_CLIENT_SECRET,
  logger: {
    error: recordAuthError,
  },
} satisfies NextAuthConfig

const handler = NextAuth(config)

export const auth = handler.auth

async function withAuthDiagnostic(
  request: Parameters<typeof handler.handlers.GET>[0],
  method: 'GET' | 'POST'
) {
  lastAuthError = ''
  const response = await handler.handlers[method](request)

  if (!lastAuthError) return response

  const headers = new Headers(response.headers)
  headers.set('x-navsphere-auth-diagnostic', lastAuthError)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const GET = (request: Parameters<typeof handler.handlers.GET>[0]) =>
  withAuthDiagnostic(request, 'GET')
export const POST = (request: Parameters<typeof handler.handlers.POST>[0]) =>
  withAuthDiagnostic(request, 'POST')
