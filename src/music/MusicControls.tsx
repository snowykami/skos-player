import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'

import { fetchPlaylist } from './api'
import { useMusic } from '@/hooks/useMusic'
import { useStoredState } from '@/hooks/useStorageState'
import { deriveLyricThemeColors, getAlbumCoverColor } from './color'
import type { MusicTrack } from '@/models/music'

export default function MusicControls() {
  const {
    currentTime,
    duration,
    currentTrack,
    togglePlay,
    next,
    prev,
    seek,
    playMode,
    playTrack,
    setCurrentIndex,
    replacePlaylist,
    playlist,
    volume,
    setVolume,
    isPlaying,
    setPlayMode,
    pause,
  } = useMusic()

  const [showPlaylist, setShowPlaylist] = useState(false)

  const [persistState, setPersistState, persistLoaded] = useStoredState<{
    trackId: number | null
    position: number
    updatedAt: number
  }>('music.persist.v1', { trackId: null, position: 0, updatedAt: 0 })
  const hasRestoredRef = useRef(false)
  const lastPersistWriteAtRef = useRef(0)
  const lastPersistPayloadRef = useRef<string>('')
  const playlistRef = useRef<HTMLDivElement>(null)
  const playlistButtonRef = useRef<HTMLButtonElement>(null)
  const playlistItemRefs = useRef<(HTMLLIElement | null)[]>([])

  const [showVolume, setShowVolume] = useState(false)
  const volumeBtnRef = useRef<HTMLButtonElement>(null)
  const volumePopupRef = useRef<HTMLDivElement>(null)

  const [playlistSearch, setPlaylistSearch] = useState('')
  const [userScrolled, setUserScrolled] = useState(false)

  // theme derived from cover
  const [progressTheme, setProgressTheme] = useState({ day: '#000', night: '#000' })
  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  useEffect(() => {
    let mounted = true
    getAlbumCoverColor(currentTrack?.albumPic || '').then((color) => {
      if (!mounted) return
      const derived = deriveLyricThemeColors(color)
      setProgressTheme({ day: derived.dayProgress, night: derived.nightProgress })
    })
    return () => {
      mounted = false
    }
  }, [currentTrack?.albumPic])

  // load playlist once
  useEffect(() => {
    if (playlist.length > 0) return
    fetchPlaylist()
      .then((tracks) => {
        const trackId = persistLoaded ? (persistState?.trackId ?? null) : null
        if (trackId != null) {
          const idx = tracks.findIndex(t => t.id === trackId)
          replacePlaylist(tracks, idx >= 0 ? idx : 0)
        }
        else {
          replacePlaylist(tracks)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch playlist:', error)
      })
  }, [playlist.length, replacePlaylist, persistLoaded, persistState?.trackId])

  const pauseRef = useRef(pause)
  useEffect(() => {
    pauseRef.current = pause
  }, [pause])

  // restore persisted track + position once after playlist & localStorage ready
  useEffect(() => {
    if (!persistLoaded) return
    if (hasRestoredRef.current) return
    if (playlist.length === 0) return

    const trackId = persistState?.trackId ?? null
    const position = Number.isFinite(persistState?.position) ? persistState.position : 0

    if (trackId == null) {
      hasRestoredRef.current = true
      return
    }

    const idx = playlist.findIndex(t => t.id === trackId)
    if (idx < 0) {
      hasRestoredRef.current = true
      return
    }

    // 恢复策略：
    // - 不自动播放
    // - 优先 seek；只有当当前曲目不是目标曲目时才切歌
    if (currentTrack?.id !== trackId) {
      pauseRef.current()
      setCurrentIndex(idx)
      seek(Math.max(0, position))
      pauseRef.current()
    }
    else {
      seek(Math.max(0, position))
      pauseRef.current()
    }

    hasRestoredRef.current = true
  }, [persistLoaded, playlist.length, persistState?.trackId, persistState?.position, playlist, currentTrack?.id, setCurrentIndex, seek])

  // persist current track + position (throttle 1s)
  useEffect(() => {
    if (!persistLoaded) return
    if (!currentTrack) return
    if (typeof currentTime !== 'number' || !Number.isFinite(currentTime)) return

    const now = Date.now()
    if (now - lastPersistWriteAtRef.current < 1000) return

    const payload = {
      trackId: currentTrack.id ?? null,
      position: Math.max(0, currentTime),
      updatedAt: now,
    }

    const payloadStr = JSON.stringify(payload)
    if (payloadStr === lastPersistPayloadRef.current) return

    lastPersistWriteAtRef.current = now
    lastPersistPayloadRef.current = payloadStr
    setPersistState(payload)
  }, [persistLoaded, currentTrack?.id, currentTime, setPersistState, currentTrack])

  // hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        togglePlay()
      }
      if (e.code === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        next()
      }
      if (e.code === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, next, prev])

  // click outside to close playlist
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        playlistRef.current &&
        !playlistRef.current.contains(event.target as Node) &&
        playlistButtonRef.current &&
        !playlistButtonRef.current.contains(event.target as Node)
      ) {
        setShowPlaylist(false)
      }
    }

    if (showPlaylist) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPlaylist])

  // click outside to close volume
  useEffect(() => {
    if (!showVolume) return
    const handleClick = (e: MouseEvent) => {
      if (
        volumePopupRef.current &&
        !volumePopupRef.current.contains(e.target as Node) &&
        volumeBtnRef.current &&
        !volumeBtnRef.current.contains(e.target as Node)
      ) {
        setShowVolume(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showVolume])

  // scroll detect
  useEffect(() => {
    const el = playlistRef.current
    if (!el || !showPlaylist) return

    const mark = () => setUserScrolled(true)
    el.addEventListener('wheel', mark, { passive: true })
    el.addEventListener('touchmove', mark, { passive: true })
    el.addEventListener('scroll', mark, { passive: true })

    return () => {
      el.removeEventListener('wheel', mark)
      el.removeEventListener('touchmove', mark)
      el.removeEventListener('scroll', mark)
    }
  }, [showPlaylist])

  function formatTime(sec: number) {
    if (!Number.isFinite(sec)) return '00:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const filteredTracksList = useMemo<MusicTrack[]>(() => {
    if (!playlist) return []
    if (!playlistSearch.trim()) return playlist
    const keywords = playlistSearch.trim().toLowerCase().split(/\s+/)
    return playlist.filter((track) => {
      const text = `${track.name || ''} ${track.artists || ''} ${track.album || ''}`.toLowerCase()
      return keywords.every((kw) => text.includes(kw))
    })
  }, [playlist, playlistSearch])

  const playModeIcon = (() => {
    if (playMode === 'shuffle') return <Shuffle className="w-5 h-5" />
    if (playMode === 'repeat-one') return <Repeat1 className="w-5 h-5" />
    return <Repeat className="w-5 h-5 rotate-0" />
  })()

  const playModeText = (() => {
    if (playMode === 'shuffle') return '随机'
    if (playMode === 'repeat-one') return '单曲循环'
    return '列表循环'
  })()

  const scrollToCurrentSong = useCallback(() => {
    if (!showPlaylist || !playlist || !currentTrack) return

    const currentIdx = playlist.findIndex((song) => song.id === currentTrack.id)
    if (currentIdx === -1) return

    const container = playlistRef.current
    const target = playlistItemRefs.current[currentIdx]
    if (container && target) {
      const containerHeight = container.clientHeight
      const targetTop = target.offsetTop
      const targetHeight = target.clientHeight
      const scrollTo = targetTop - containerHeight / 2 + targetHeight / 2
      container.scrollTo({ top: scrollTo, behavior: 'smooth' })
    }
  }, [currentTrack, showPlaylist, playlist])

  const handlePlaylistClick = () => {
    const nextShow = !showPlaylist
    setShowPlaylist(nextShow)
    if (nextShow) {
      setUserScrolled(false)
      setTimeout(scrollToCurrentSong, 100)
    }
  }

  useEffect(() => {
    if (showPlaylist && currentTrack && !userScrolled) {
      setTimeout(scrollToCurrentSong, 100)
    }
  }, [showPlaylist, currentTrack, userScrolled, scrollToCurrentSong])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value))
  }

  const handleVolumeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value) / 100)
  }

  return (
    <div className="shrink-0 bg-gray-800/10 dark:bg-stone-300/10">
      <div className="relative flex items-center h-0">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime || 0}
          onChange={handleSeek}
          className={
            `w-full h-1 rounded-full appearance-none outline-none transition
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow
            [&::-webkit-slider-thumb]:border
            [&::-webkit-slider-thumb]:transition
            group-hover:[&::-webkit-slider-thumb]:opacity-100
            [&::-webkit-slider-thumb]:opacity-0
            dark:[&::-webkit-slider-thumb]:bg-blue-300`
          }
          style={{ accentColor: isDark ? progressTheme.night : progressTheme.day }}
        />

        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-gray-300 dark:bg-gray-700 rounded-full pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full pointer-events-none"
          style={{
            width: (duration || 0) > 0 ? `${((currentTime || 0) / (duration || 1)) * 100}%` : '0%',
            backgroundColor: isDark ? progressTheme.night : progressTheme.day,
          }}
          aria-hidden
        />
      </div>

      <div className="flex items-center px-4 py-2 bg-gray-100/40 dark:bg-gray-800/40 border-t border-gray-300 dark:border-gray-700">
        <div className="flex flex-1 items-center justify-start gap-3">
          <button
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-1"
            onClick={() =>
              setPlayMode(playMode === 'repeat-all' ? 'repeat-one' : playMode === 'repeat-one' ? 'shuffle' : 'repeat-all')
            }
            title={playModeText}
          >
            {playModeIcon}
          </button>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-mono select-none tabular-nums">
            {formatTime(currentTime || 0)} / {formatTime(duration || 0)}
          </span>
        </div>

        <div className="flex flex-1 justify-center items-center gap-4">
          <button
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            onClick={prev}
            title="上一首"
          >
            <SkipBack className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
          <button
            className="p-3 rounded-full bg-slate-600 dark:bg-slate-200 text-white dark:text-slate-800 shadow-lg hover:scale-105 transition"
            onClick={togglePlay}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
          </button>
          <button
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            onClick={next}
            title="下一首"
          >
            <SkipForward className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        <div className="flex flex-1 justify-end items-center gap-2 relative">
          <button
            ref={volumeBtnRef}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title="音量"
            onClick={() => setShowVolume((v) => !v)}
          >
            <Volume2 className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          {showVolume && (
            <div
              ref={volumePopupRef}
              className="absolute bottom-full right-14 mb-2 w-12 h-36 bg-white dark:bg-gray-800 rounded-md shadow-lg flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 z-50"
            >
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={handleVolumeInputChange}
                className="h-28 w-2 accent-blue-500 cursor-pointer"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              />
              <div className="text-xs mt-2 text-gray-700 dark:text-gray-200 select-none">{(volume * 100) | 0}%</div>
            </div>
          )}

          <button
            ref={playlistButtonRef}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title="播放列表"
            onClick={handlePlaylistClick}
          >
            <ListMusic className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          {showPlaylist && (
            <div
              ref={playlistRef}
              className="absolute bottom-full right-0 mb-2 w-72 h-80 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-y-auto border border-gray-200 dark:border-gray-700 z-50 scroll-smooth"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 z-10">
                播放列表
              </div>

              <div className="sticky top-10 bg-white dark:bg-gray-800 px-2 py-1 z-10">
                <input
                  type="text"
                  value={playlistSearch}
                  onChange={(e) => setPlaylistSearch(e.target.value)}
                  placeholder="搜索歌曲/歌手/专辑"
                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {filteredTracksList === null ? (
                <div className="p-2 text-center text-gray-500 dark:text-gray-400">加载中...</div>
              ) : filteredTracksList.length === 0 ? (
                <div className="p-2 text-center text-gray-500 dark:text-gray-400">没有结果</div>
              ) : (
                <ul>
                  {filteredTracksList.map((song, index) => {
                    const isCurrentSong = song.audio === currentTrack?.audio
                    const origIdx = playlist?.findIndex((s) => s.id === song.id) ?? -1

                    return (
                      <li
                        key={song.id || index}
                        ref={(el) => {
                          if (origIdx >= 0) playlistItemRefs.current[origIdx] = el
                        }}
                        onClick={() => {
                          if (origIdx >= 0) playTrack(origIdx)
                        }}
                        className={`p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          isCurrentSong
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <div className="truncate">
                          {song.name || '无标题'} - {song.artists.join('/') || '未知歌手'}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
