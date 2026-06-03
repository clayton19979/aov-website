'use client'

export function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      className="font-mono text-xs tracking-widest uppercase text-white/15 hover:text-white/40 transition-colors"
    >
      EXIT
    </button>
  )
}
