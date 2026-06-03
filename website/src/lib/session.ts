import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'aov-dev-secret-change-in-production'
)

type SessionPayload = {
  address: string
  tribeId: number
  characterName: string
  characterId: number
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('aov-session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
