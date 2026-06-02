import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { verifyPersonalMessageSignature } from '@mysten/sui/verify'

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'aov-dev-secret-change-in-production'
)

const SESSION_DURATION_HOURS = 24

export async function POST(req: NextRequest) {
  try {
    const { address, message, signature, tribeId } = await req.json()

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Verify the wallet signature (proves ownership of the address)
    try {
      const publicKey = await verifyPersonalMessageSignature(
        new TextEncoder().encode(message),
        signature
      )
      // Ensure the recovered address matches the claimed address
      if (publicKey.toSuiAddress() !== address) {
        return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Issue JWT session cookie
    const token = await new SignJWT({ address, tribeId })
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
