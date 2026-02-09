import { useAsyncTask } from '@snowykami/use-async-task'
import { useEffect, useRef } from 'react'
import { useLyric } from '@/hooks/useLyric'
import { useMusic } from '@/hooks/useMusic'
import { convertToRawLyricResponse, fetchLyric } from '@/utils/lyricApi'
import MusicControls from './MusicControls'
import PlayerView from './PlayerView'

const OVERLAYCOLOR = 'bg-slate-200/60'
const OVERLAYCOLORDARK = 'dark:bg-slate-800/60'

export default function Music() {
  const { currentTrack, currentTime, isPlaying } = useMusic()
  const { loadLyric, clearLyric, setCurrentTime, setIsPlaying } = useLyric()
  const lastSongTitleRef = useRef<string | null>(null)
  const activeLyricIdRef = useRef<number | null>(null)

  const { execute: fetchAndCacheLyric } = useAsyncTask(
    async (lyricId: number) => {
      const apiResponse = await fetchLyric(lyricId)

      if (apiResponse.code !== 200) {
        throw new Error(`Lyric API returned code ${apiResponse.code}`)
      }

      return convertToRawLyricResponse(apiResponse)
    },
    {
      // 仅用于缓存同一首歌的歌词，避免重复请求
      immediate: false,
      cacheTime: 10 * 60 * 1000,
      taskKey: (lyricId: number) => `lyric-${lyricId}`,
    },
  )

  const currentCoverUrl = currentTrack?.albumPic || 'https://cdn.liteyuki.org/blog/background.png'

  // 更新页面标题
  useEffect(() => {
    if (!currentTrack)
      return
    const title = currentTrack.name || 'Music Player'
    if (lastSongTitleRef.current === title)
      return
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
      activeLyricIdRef.current = null
      clearLyric()
      return
    }

    const lyricId = (currentTrack as { lyricId?: number }).lyricId ?? currentTrack.id
    activeLyricIdRef.current = lyricId

    // 切歌时先清空，避免短暂显示上一首歌词
    clearLyric()

    const loadLyricAsync = async () => {
      try {
        const rawLyric = await fetchAndCacheLyric(lyricId)

        // 竞态保护：如果请求返回时歌曲已切换，丢弃结果
        if (activeLyricIdRef.current !== lyricId)
          return

        if (rawLyric) {
          loadLyric(rawLyric)
        }
      }
      catch (error) {
        console.error('Failed to load lyric:', error)

        // 同样避免清掉“新歌”的歌词状态
        if (activeLyricIdRef.current === lyricId) {
          clearLyric()
        }
      }
    }

    void loadLyricAsync()

    return () => {
      if (activeLyricIdRef.current === lyricId) {
        activeLyricIdRef.current = null
      }
    }
  }, [currentTrack, fetchAndCacheLyric, loadLyric, clearLyric])

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
