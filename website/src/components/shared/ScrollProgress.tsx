'use client'

import { useEffect, useState } from 'react'

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function update() {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const max = scrollHeight - clientHeight
      setProgress(max > 0 ? scrollTop / max : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  const pct = `${progress * 100}%`

  return (
    <div className="fixed top-0 left-0 right-0 h-px z-50 bg-void-teal/10">
      <div
        className="relative h-full overflow-visible"
        style={{ width: pct, transition: 'width 80ms linear' }}
      >
        {/* comet-tail gradient: transparent → full teal */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, transparent, #00b4d899 55%, #00b4d8)' }}
        />
        {/* glowing head at the leading edge */}
        {progress > 0 && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-[3px] rounded-full"
            style={{
              background: '#00b4d8',
              boxShadow: '0 0 6px 2px #00b4d8aa, 0 0 14px 4px #00b4d855',
            }}
          />
        )}
      </div>
    </div>
  )
}
