import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { LyricProvider } from '@/contexts/LyricContext'

import { MusicProvider } from '@/contexts/MusicContext'
import Music from '@/music/Music'
import { DeviceProvider } from './contexts/DeviceContext'

const dragStyle = { WebkitAppRegion: 'drag' } as CSSProperties & {
  WebkitAppRegion: 'drag'
}

const dragOverlayStyle = {
  ...dragStyle,
  inset: '6px 6px auto 6px',
  height: '34px',
} as CSSProperties & { WebkitAppRegion: 'drag' }

function App() {
  useEffect(() => {
    const thresholdPx = 6

    const setCursor = (cursor: string) => {
      document.body.style.cursor = cursor
    }

    const onMouseMove = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY
      const w = window.innerWidth
      const h = window.innerHeight

      const left = x <= thresholdPx
      const right = x >= w - thresholdPx
      const top = y <= thresholdPx
      const bottom = y >= h - thresholdPx

      let cursor = ''
      if ((left && top) || (right && bottom))
        cursor = 'nwse-resize'
      else if ((right && top) || (left && bottom))
        cursor = 'nesw-resize'
      else if (left || right)
        cursor = 'ew-resize'
      else if (top || bottom)
        cursor = 'ns-resize'

      setCursor(cursor)
    }

    const onMouseLeave = () => setCursor('')

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      setCursor('')
    }
  }, [])

  return (
    <div className="h-full relative overflow-hidden">
      <LyricProvider>
        <MusicProvider>
          <DeviceProvider>
            <Music />
          </DeviceProvider>
        </MusicProvider>
      </LyricProvider>
      <div className="absolute z-50" style={dragOverlayStyle} />
    </div>
  )
}

export default App
