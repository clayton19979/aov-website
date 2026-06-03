import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { checkTribeMembership } from '@/lib/tribe'

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'aov-dev-secret-change-in-production'
)

const SESSION_DURATION_HOURS = 24

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 })
    }

    // Independently verify tribe membership server-side — never trust client-supplied tribeId.
    const result = await checkTribeMembership(address)

    if (result.status === 'no-character') {
      return NextResponse.json({ error: 'No character found for this wallet' }, { status: 403 })
    }
    if (result.status === 'wrong-tribe') {
      return NextResponse.json({ error: 'Tribe verification failed' }, { status: 403 })
    }
    if (result.status === 'error') {
      console.error('Auth verify tribe check error:', result.message)
      return NextResponse.json({ error: 'Tribe verification error' }, { status: 502 })
    }

    const { tribeId, characterName, characterId } = result

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
