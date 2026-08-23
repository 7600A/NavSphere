import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET() {
  return NextResponse.json({
    app: 'NavSphere',
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'edge',
    authRuntime: {
      authSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      githubClientId: Boolean(process.env.GITHUB_CLIENT_ID),
      githubClientSecret: Boolean(process.env.GITHUB_CLIENT_SECRET),
      webCrypto: Boolean(globalThis.crypto?.subtle),
    },
  })
}
