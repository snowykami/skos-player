/**
 * Lyric Context - 歌词状态管理
 */

import type { LyricLine, LyricMetadata, LyricParseResult, LyricState, LyricTrack } from '@/lyric/types'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { parse } from '@/lyric/parse'
import { syncByTime } from '@/lyric/sync'

interface RawLyricResponse {
  lrc?: { lyric: string, version: number } | null
  tlyric?: { lyric: string, version: number } | null
  romalrc?: { lyric: string, version: number } | null
  yrc?: { lyric: string, version: number } | null
  ytlrc?: { lyric: string, version: number } | null
  yromalrc?: { lyric: string, version: number } | null
}

/**
 * 歌词附加模式（三态开关）
 */
export type LyricMode = 'none' | 'translation' | 'romaji'

interface LyricContextValue {
  // 歌词状态
  lyricState: LyricState
  metadata: LyricMetadata[]
  isInstrumental: boolean
  sourceType: LyricParseResult['sourceType']

  // 便捷访问属性
  currentTime: number
  currentLyricIndex: number
  currentWordIndex: number
  lyricLines: LyricLine[]
  tracks: LyricTrack[]

  // 轨道可用性
  hasTranslation: boolean
  hasRomaji: boolean

  // 模式状态
  lyricMode: LyricMode

  // 操作方法
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  seek: (time: number) => void
  setLyricMode: (mode: LyricMode) => void
  loadLyric: (rawLyric: RawLyricResponse) => void
  clearLyric: () => void
}

const LyricContext = createContext<LyricContextValue | null>(null)

export const LyricProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lyricState, setLyricState] = useState<LyricState>({
    currentTime: 0,
    currentLineIndex: -1,
    currentWordIndex: -1,
    tracks: [],
    isPlaying: false,
  })

  const [metadata, setMetadata] = useState<LyricMetadata[]>([])
  const [isInstrumental, setIsInstrumental] = useState(true)
  const [sourceType, setSourceType] = useState<LyricParseResult['sourceType']>('none')
  const [lyricMode, setLyricModeState] = useState<LyricMode>('none')

  // 便捷访问属性
  const currentTime = lyricState.currentTime
  const currentLyricIndex = lyricState.currentLineIndex
  const currentWordIndex = lyricState.currentWordIndex
  const lyricLines = lyricState.tracks[0]?.data.lines || []
  const tracks = lyricState.tracks

  // 轨道可用性
  const hasTranslation = useMemo(() => tracks.some(t => t.type === 'translation'), [tracks])
  const hasRomaji = useMemo(() => tracks.some(t => t.type === 'romaji'), [tracks])

  // 更新当前时间并同步歌词状态
  const setCurrentTime = useCallback((time: number) => {
    setLyricState(prev => syncByTime(prev, time))
  }, [])

  // 更新播放状态
  const setIsPlaying = useCallback((playing: boolean) => {
    setLyricState(prev => ({ ...prev, isPlaying: playing }))
  }, [])

  // 跳转到指定时间
  const seek = useCallback((time: number) => {
    setLyricState((prev) => {
      const newState = syncByTime(prev, time)
      return { ...newState, isPlaying: prev.isPlaying }
    })
  }, [])

  // 设置模式
  const setLyricMode = useCallback((mode: LyricMode) => {
    setLyricModeState(mode)
    // 更新对应轨道的启用状态
    setLyricState((prev) => {
      const newTracks = prev.tracks.map((track) => {
        if (track.type === 'original') {
          return { ...track, enabled: true }
        }
        if (track.type === 'translation') {
          return { ...track, enabled: mode === 'translation' }
        }
        if (track.type === 'romaji') {
          return { ...track, enabled: mode === 'romaji' }
        }
        return track
      })
      return { ...prev, tracks: newTracks }
    })
  }, [])

  // 加载歌词
  const loadLyric = useCallback((rawLyric: RawLyricResponse) => {
    const result = parse(rawLyric)

    // 不要在切歌/重新加载歌词时覆盖用户选择的模式
    // 当前 lyricMode 由用户交互决定；这里只根据现有 lyricMode 同步轨道启用状态
    result.state.tracks.forEach((track) => {
      if (track.type === 'original') {
        track.enabled = true
      }
      else if (track.type === 'translation') {
        track.enabled = lyricMode === 'translation'
      }
      else if (track.type === 'romaji') {
        track.enabled = lyricMode === 'romaji'
      }
    })

    setLyricState(result.state)
    setMetadata(result.metadata)
    setIsInstrumental(result.isInstrumental)
    setSourceType(result.sourceType)
  }, [lyricMode])

  // 清空歌词
  const clearLyric = useCallback(() => {
    // 避免重复 setState 触发不必要的渲染/循环（例如外部 effect 依赖 clearLyric）
    setLyricState((prev) => {
      if (
        prev.currentTime === 0
        && prev.currentLineIndex === -1
        && prev.currentWordIndex === -1
        && prev.tracks.length === 0
        && prev.isPlaying === false
      ) {
        return prev
      }
      return {
        currentTime: 0,
        currentLineIndex: -1,
        currentWordIndex: -1,
        tracks: [],
        isPlaying: false,
      }
    })

    setMetadata(prev => (prev.length === 0 ? prev : []))
    setIsInstrumental(prev => (prev === true ? prev : true))
    setSourceType(prev => (prev === 'none' ? prev : 'none'))
    // 不强制重置 lyricMode，保持用户选择
  }, [])

  const value: LyricContextValue = {
    lyricState,
    metadata,
    isInstrumental,
    sourceType,
    currentTime,
    currentLyricIndex,
    currentWordIndex,
    lyricLines,
    tracks,
    hasTranslation,
    hasRomaji,
    lyricMode,
    setCurrentTime,
    setIsPlaying,
    seek,
    setLyricMode,
    loadLyric,
    clearLyric,
  }

  return <LyricContext.Provider value={value}>{children}</LyricContext.Provider>
}

/**
 * 使用歌词上下文
 */
export function useLyric(): LyricContextValue {
  const ctx = useContext(LyricContext)
  if (!ctx) {
    throw new Error('useLyric must be used within LyricProvider')
  }
  return ctx
}

export type { LyricContextValue }
