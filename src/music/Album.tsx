import { useEffect, useRef, useState } from 'react'
import { useMusic } from '@/hooks/useMusic'

const MIN_DIAMETER = 120
const MAX_DIAMETER = 300

export type AlbumProps = {
  onClick?: () => void
}

export function Album({ onClick }: AlbumProps) {
  const { currentTrack, rotateDeg, isPlaying, currentIndex, playlist } = useMusic()
  const containerRef = useRef<HTMLDivElement>(null)
  const [diameter, setDiameter] = useState(200)

  // preload next cover + audio
  useEffect(() => {
    if (playlist.length === 0)
      return
    const nextIndex = ((currentIndex || 0) + 1) % playlist.length
    const nextTrack = playlist[nextIndex]

    if (nextTrack?.albumPic) {
      const img = new window.Image()
      img.src = nextTrack.albumPic
    }

    if (nextTrack?.audio) {
      const audio = new Audio()
      audio.src = nextTrack.audio
      audio.preload = 'metadata'
      audio.load()
    }
  }, [playlist, currentIndex])

  // resize diameter
  useEffect(() => {
    function updateDiameter() {
      if (containerRef.current && containerRef.current.parentElement) {
        const parentWidth = containerRef.current.parentElement.offsetWidth
        const calculatedDiameter = Math.floor(parentWidth * 0.6)
        setDiameter(Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, calculatedDiameter)))
      }
    }

    updateDiameter()
    const parent = containerRef.current?.parentElement
    if (!parent)
      return

    const observer = new window.ResizeObserver(updateDiameter)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  if (!currentTrack?.albumPic) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center bg-gray-200 text-gray-400 rounded-full mx-auto"
        style={{ width: diameter, height: diameter, fontSize: diameter / 8 }}
      >
        无封面
      </div>
    )
  }

  const coverSize = diameter * 0.618

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center mx-auto"
      style={{ width: diameter, height: diameter }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div
        className="absolute left-0 top-0 flex items-center justify-center rounded-full shadow-xl"
        style={{
          width: diameter,
          height: diameter,
          background: 'radial-gradient(circle at 60% 40%, #222 70%, #444 100%)',
          border: `${Math.max(6, diameter * 0.04)}px solid #222`,
          transform: `rotate(${rotateDeg}deg)`,
          transition: isPlaying ? 'none' : 'transform 0.3s cubic-bezier(.4,2,.6,1)',
        }}
      >
        <img
          src={currentTrack.albumPic}
          alt={currentTrack.name}
          className="rounded-full border-4 border-white object-cover shadow-md bg-white"
          style={{ width: coverSize, height: coverSize, zIndex: 2 }}
          draggable={false}
        />
      </div>
    </div>
  )
}
