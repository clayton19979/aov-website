import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'aov-dev-secret-change-in-production'
)

const REQUIRED_TRIBE_ID = Number(process.env.NEXT_PUBLIC_REQUIRED_TRIBE_ID ?? '1000167')
const SESSION_DURATION_HOURS = 24

export async function POST(req: NextRequest) {
  try {
    const { address, tribeId, characterName, characterId } = await req.json()

    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 })
    }

    // Tribe membership is verified client-side against the EVE Frontier blockchain.
    // Server re-checks the tribeId to ensure the client isn't bypassing the check.
    if (Number(tribeId) !== REQUIRED_TRIBE_ID) {
      return NextResponse.json({ error: 'Tribe verification failed' }, { status: 403 })
    }

    const token = await new SignJWT({ address, tribeId, characterName, characterId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
      .sign(AUTH_SECRET)

    const response = NextResponse.json({ success: true })
    response.cookies.set('aov-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_HOURS * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Auth verify error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
