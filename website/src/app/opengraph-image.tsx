import { ImageResponse } from 'next/og'

export const alt = 'Architects of the Void signal card'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

const accent = '#00b4d8'
const bg = '#020b0e'
const text = '#e8fbff'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: bg,
          color: text,
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 42%, rgba(0,180,216,0.22) 0, rgba(0,180,216,0.04) 30%, rgba(2,11,14,0) 58%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 40,
            border: '1px solid rgba(0,180,216,0.22)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            top: 96,
            height: 1,
            background: 'rgba(0,180,216,0.34)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: 96,
            height: 1,
            background: 'rgba(0,180,216,0.18)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 118,
            top: 142,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 330,
            height: 330,
            borderRadius: 999,
            border: '1px solid rgba(0,180,216,0.38)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 230,
              height: 230,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,180,216,0.04)',
            }}
          >
            <div
              style={{
                width: 118,
                height: 118,
                borderRadius: 999,
                background: accent,
                opacity: 0.92,
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: 999,
                background: bg,
                transform: 'translateX(28px)',
              }}
            />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 520,
            top: 132,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            width: 560,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: accent,
              fontSize: 22,
              letterSpacing: 8,
            }}
          >
            AOV // VOID SIGNAL
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 74,
              lineHeight: 0.95,
              letterSpacing: 4,
              fontWeight: 800,
            }}
          >
            <span>ARCHITECTS</span>
            <span>OF THE VOID</span>
          </div>
          <div
            style={{
              display: 'flex',
              width: 120,
              height: 2,
              background: accent,
              opacity: 0.72,
            }}
          />
          <div
            style={{
              display: 'flex',
              maxWidth: 520,
              color: 'rgba(232,251,255,0.66)',
              fontSize: 25,
              lineHeight: 1.45,
              letterSpacing: 2,
            }}
          >
            WE DO NOT RECRUIT. WE RECOGNIZE.
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 80,
            bottom: 52,
            display: 'flex',
            color: 'rgba(232,251,255,0.28)',
            fontSize: 18,
            letterSpacing: 4,
          }}
        >
          EXISTENCE MUST BE DESIGNED
        </div>
        <div
          style={{
            position: 'absolute',
            right: 80,
            bottom: 52,
            display: 'flex',
            color: 'rgba(0,180,216,0.48)',
            fontSize: 18,
            letterSpacing: 4,
          }}
        >
          THE VOID WASTES NOTHING
        </div>
      </div>
    ),
    size
  )
}
