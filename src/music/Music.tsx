import { useEffect, useRef } from 'react'
import MusicControls from './MusicControls'
import PlayerView from './PlayerView'
import { useMusic } from '@/hooks/useMusic'
import { useLyric } from '@/hooks/useLyric'
import { fetchLyric, convertToRawLyricResponse } from '@/utils/lyricApi'

const OVERLAYCOLOR = 'bg-slate-200/60'
const OVERLAYCOLORDARK = 'dark:bg-slate-800/60'

export default function Music() {
  const { currentTrack, currentTime, isPlaying } = useMusic()
  const { loadLyric, clearLyric, setCurrentTime, setIsPlaying } = useLyric()
  const lastSongTitleRef = useRef<string | null>(null)
  const lastLyricIdRef = useRef<number | null>(null)

  const currentCoverUrl = currentTrack?.albumPic || 'https://cdn.liteyuki.org/blog/background.png'

  // 更新页面标题
  useEffect(() => {
    if (!currentTrack) return
    const title = currentTrack.name || 'Music Player'
    if (lastSongTitleRef.current === title) return
    document.title = `${title} - ${currentTrack.artists?.join(', ') || 'Music Player'}`
    lastSongTitleRef.current = title
  }, [currentTrack])

  // 同步歌词时间
  // 歌词同步模块使用毫秒，audio.currentTime 为秒，这里统一转换为毫秒
  useEffect(() => {
    if (currentTime !== null) {
      setCurrentTime(currentTime * 1000)
    }
  }, [currentTime, setCurrentTime])

  // 同步播放状态到歌词上下文
  useEffect(() => {
    setIsPlaying(isPlaying)
  }, [isPlaying, setIsPlaying])

  // 加载歌词
  useEffect(() => {
    if (!currentTrack) {
      clearLyric()
      return
    }

    const lyricId = (currentTrack as { lyricId?: number }).lyricId ?? currentTrack.id

    if (lastLyricIdRef.current === lyricId) return

    const loadLyricAsync = async () => {
      try {
        const apiResponse = await fetchLyric(lyricId)
        if (apiResponse.code === 200) {
          const rawLyric = convertToRawLyricResponse(apiResponse)
          loadLyric(rawLyric)
        }
      } catch (error) {
        console.error('Failed to load lyric:', error)
        clearLyric()
      }
    }

    lastLyricIdRef.current = lyricId
    void loadLyricAsync()

    return () => {
      lastLyricIdRef.current = null
    }
  }, [currentTrack, loadLyric, clearLyric])

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className={`absolute inset-0 z-5 ${OVERLAYCOLOR} ${OVERLAYCOLORDARK} transition-colors duration-600`} />

      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-600 blur-xl scale-110"
        style={{ backgroundImage: `url(${currentCoverUrl})` }}
      />

      <div className="flex flex-col h-full z-10 relative pt-6">
        <PlayerView />
        <MusicControls />
      </div>
    </div>
  )
}
