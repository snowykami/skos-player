import React, { useEffect, useRef } from 'react'
import { deriveLyricThemeColors, getAlbumCoverColor } from './color'
import { useLyric } from '@/hooks/useLyric'
import { useMusic } from '@/hooks/useMusic'
import type { LyricLine } from '@/lyric/types'
import type { LyricMode } from '@/contexts/LyricContext'

export default function LyricScroller() {
  const {
    lyricLines,
    currentLyricIndex,
    currentWordIndex,
    currentTime,
    seek,
    tracks,
    sourceType,
    lyricMode,
    setLyricMode,
    hasTranslation,
    hasRomaji,
  } = useLyric()
  const { currentTrack, isPlaying, getAudio } = useMusic()
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  // 主题颜色
  const [lyricTheme, setLyricTheme] = React.useState(() => {
    const d = deriveLyricThemeColors('rgb(100, 100, 100)')
    return {
      dayText: d.dayText,
      dayBg: d.dayBg,
      nightText: d.nightText,
      nightBg: d.nightBg,
      dayOtherText: d.dayOtherText,
      nightOtherText: d.nightOtherText,
      dayProgress: d.dayProgress,
      nightProgress: d.nightProgress,
    }
  })


  // 封面颜色提取
  useEffect(() => {
    let mounted = true
    getAlbumCoverColor(currentTrack?.albumPic || '').then((color) => {
      if (!mounted) return
      const d = deriveLyricThemeColors(color)
      setLyricTheme({
        dayText: d.dayText,
        dayBg: d.dayBg,
        nightText: d.nightText,
        nightBg: d.nightBg,
        dayOtherText: d.dayOtherText,
        nightOtherText: d.nightOtherText,
        dayProgress: d.dayProgress,
        nightProgress: d.nightProgress,
      })
    })
    return () => {
      mounted = false
    }
  }, [currentTrack?.albumPic])

  // 自动滚动控制：默认启用；一旦用户手动滚动，则暂时停止自动滚动
  // 当歌词行更新（currentLyricIndex 变化）时，自动回正到当前行
  const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true)
  const isAutoScrollingRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onUserScroll = () => {
      // 如果是代码触发的滚动，不视为用户滚动
      if (isAutoScrollingRef.current) return
      setAutoScrollEnabled(false)
    }

    // wheel/touch/scroll 都可能触发，这里用 scroll + 标记过滤
    container.addEventListener('scroll', onUserScroll, { passive: true })
    return () => container.removeEventListener('scroll', onUserScroll)
  }, [])


  // 滚动到当前行：
  // - 当 autoScrollEnabled=true 时持续跟随当前行
  // - 当用户手动滚动（autoScrollEnabled=false）后，仅在歌词行更新（currentLyricIndex 变化）时回正一次
  const lastAutoAlignedIndexRef = useRef<number>(-1)

  useEffect(() => {
    const shouldAlign = autoScrollEnabled || (currentLyricIndex !== lastAutoAlignedIndexRef.current)
    if (!shouldAlign) return
    if (!containerRef.current || !lineRefs.current[currentLyricIndex] || lyricLines.length === 0) return

    const container = containerRef.current
    const target = lineRefs.current[currentLyricIndex]
    const containerHeight = container.clientHeight
    const targetOffset = (target?.offsetTop ?? 0) - containerHeight * 0.35 + (target?.clientHeight ?? 0) / 2

    // 已经在附近就不滚，避免因行高变化反复触发造成闪烁
    const diff = targetOffset - container.scrollTop
    if (Math.abs(diff) < 6) return

    const start = container.scrollTop
    const change = diff
    const duration = 380
    let startTime: number | null = null

    function animateScroll(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
      isAutoScrollingRef.current = true
      container.scrollTop = start + change * ease
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      } else {
        lastAutoAlignedIndexRef.current = currentLyricIndex
        // 下一帧再释放标记，避免 scroll 事件误判
        requestAnimationFrame(() => {
          isAutoScrollingRef.current = false
        })
      }
    }

    requestAnimationFrame(animateScroll)
  }, [autoScrollEnabled, currentLyricIndex, lyricLines.length])

  // 获取原文行的显示文本
  const getOriginalText = (line: LyricLine): string => {
    return line.items.map(item => item.text).join('')
  }

  // 逐字进度（0~1）：用于做从左到右的平滑颜色变化
  // 注意：LyricContext 的 currentTime 更新频率较低（为 UI 节流），逐字高亮需要更高频
  // 因此这里使用 RAF 直接读取 audio.currentTime（秒）并转换为毫秒，避免全局高频 setState
  const [smoothTime, setSmoothTime] = React.useState(0)

  useEffect(() => {
    let rafId = 0
    let mounted = true
    let lastRenderedMs = -1

    const tick = () => {
      if (!mounted) return
      const audio = getAudio()
      if (audio) {
        // 音频时间单位：秒 -> 毫秒
        const t = audio.currentTime * 1000
        // 如果时间没有变化就不 setState，避免暂停时空转渲染
        if (t !== lastRenderedMs) {
          lastRenderedMs = t
          setSmoothTime(t)
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      mounted = false
      cancelAnimationFrame(rafId)
    }
  }, [getAudio, isPlaying])

  const getWordProgress = (line: LyricLine, wordIndex: number): number => {
    const item = line.items[wordIndex]
    if (!item || item.duration <= 0) {
      return wordIndex < currentWordIndex ? 1 : 0
    }

    const t = smoothTime || (currentTime ?? 0)
    if (t <= item.startTime) return 0
    if (t >= item.startTime + item.duration) return 1
    return (t - item.startTime) / item.duration
  }

  // 根据时间获取当前行的翻译或罗马音
  const getExtraTextForLine = (lineStartTime: number): string => {
    if (lyricMode === 'none') return ''

    // 查找对应模式的轨道
    const track = tracks.find(t => t.type === lyricMode && t.enabled)
    if (!track) return ''

    // 在轨道中查找对应时间的行
    const extraLine = track.data.lines.find(l => l.startTime === lineStartTime)
    if (extraLine) {
      return extraLine.items.map(item => item.text).join('')
    }

    // 找不到精确匹配，尝试找最近的行
    if (track.data.lines.length > 0) {
      const closestLine = track.data.lines.reduce((prev, curr) =>
        Math.abs(curr.startTime - lineStartTime) < Math.abs(prev.startTime - lineStartTime) ? curr : prev
      )
      return closestLine.items.map(item => item.text).join('')
    }

    return ''
  }

  // 智能按钮逻辑
  const getButtonConfig = (): { text: string; show: boolean; active: boolean } => {
    // 只有原文时，不显示按钮
    if (!hasTranslation && !hasRomaji) {
      return { text: '', show: false, active: false }
    }

    // 只有翻译时
    if (hasTranslation && !hasRomaji) {
      return { text: '译', show: true, active: lyricMode === 'translation' }
    }

    // 只有罗马音时
    if (!hasTranslation && hasRomaji) {
      return { text: '音', show: true, active: lyricMode === 'romaji' }
    }

    // 两者都有时
    return { text: '译/音', show: true, active: lyricMode !== 'none' }
  }

  // 切换模式
  const cycleMode = () => {
    if (!hasTranslation && !hasRomaji) return

    const modes: LyricMode[] = ['none', 'translation', 'romaji']
    const currentIndex = modes.indexOf(lyricMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setLyricMode(modes[nextIndex])
  }

  const buttonConfig = getButtonConfig()

  return (
    <div className="relative h-full flex flex-col">
      {/* 智能模式切换按钮 */}
      {buttonConfig.show && (
        <div className="flex justify-end px-2 mb-2">
          <button
            onClick={cycleMode}
            className={`px-3 py-1 text-sm rounded transition-all duration-200 ${
              buttonConfig.active
                ? 'shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            style={
              buttonConfig.active
                ? { backgroundColor: isDark ? lyricTheme.nightProgress : lyricTheme.dayProgress, color: '#fff' }
                : undefined
            }
          >
            {buttonConfig.text}
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 text-base leading-10 relative transition-colors max-w-full hide-scrollbar"
      >
        {lyricLines.length === 0 ? (
          <div className="text-center text-slate-600 dark:text-slate-500">暂无歌词</div>
        ) : (
          lyricLines.map((line, idx) => {
            const offset = idx - currentLyricIndex
            const isCurrent = idx === currentLyricIndex

            // 样式计算
            let styleClass = ''
            if (offset === 0) styleClass = 'opacity-100 scale-100 translate-y-0 z-10'
            else if (Math.abs(offset) === 1) styleClass = `opacity-90 scale-95 ${offset > 0 ? 'translate-y-2' : '-translate-y-2'} z-0`
            else if (Math.abs(offset) === 2) styleClass = `opacity-80 scale-95 ${offset > 0 ? 'translate-y-4' : '-translate-y-4'} z-0`
            else styleClass = `opacity-70 scale-95 ${offset > 0 ? 'translate-y-6' : '-translate-y-6'} z-0`

            const originalText = getOriginalText(line)
            const extraText = getExtraTextForLine(line.startTime)

            return (
              <div
                key={line.startTime + originalText + idx}
                onClick={() => seek(line.startTime / 1000)}
                ref={(el) => {
                  lineRefs.current[idx] = el
                }}
                className={`select-none px-2 py-1 rounded transition-all duration-300 ease-out w-full relative cursor-pointer ${styleClass}`}
                onMouseDown={() => setAutoScrollEnabled(true)}
                onTouchStart={() => setAutoScrollEnabled(true)}
                style={{
                  color: (() => {
                    if (!isCurrent) {
                      return isDark ? lyricTheme.nightOtherText : lyricTheme.dayOtherText
                    }

                    // 按“行结构”判断是否为逐行（无逐字时长信息）：
                    // - 只有一个 item
                    // - 或所有 item.duration <= 0
                    // 满足则整行用进度色，表示“已播放颜色”
                    const isLineLike = line.items.length <= 1 || line.items.every(i => (i.duration ?? 0) <= 0)
                    if (isLineLike) {
                      return isDark ? lyricTheme.nightProgress : lyricTheme.dayProgress
                    }

                    return isDark ? lyricTheme.nightText : lyricTheme.dayText
                  })(),
                  filter: isCurrent ? 'drop-shadow(0 2px 8px #60a5fa44)' : undefined,
                }}
              >
                {/* 原文行 */}
                <div
                  className="font-bold"
                  style={{
                    fontSize: isCurrent ? '1.5rem' : '1.25rem',
                    transform: sourceType === 'yrc' && isCurrent ? 'scale(1.06)' : 'scale(1)',
                    transformOrigin: 'left center',
                    transition: 'transform 220ms ease-out',
                    willChange: sourceType === 'yrc' && isCurrent ? 'transform' : undefined,
                  }}
                >
                  {/* 逐字卡拉OK效果（平滑从左到右变色） */}
                  {line.items.map((item, wordIdx) => {
                    const isWordActive = isCurrent && wordIdx === currentWordIndex
                    const isWordPast = isCurrent && wordIdx < currentWordIndex
                    const progress = isCurrent ? getWordProgress(line, wordIdx) : 0
                    const progressColor = isDark ? lyricTheme.nightProgress : lyricTheme.dayProgress

                    // 互换“已播放/未播放”的视觉：
                    // - 未播放：显示进度色
                    // - 已播放：显示基底色（当前行颜色）
                    const baseColor = isDark ? lyricTheme.nightText : lyricTheme.dayText

                    // 用叠层 + clipPath 实现“单个字从左到右平滑上色”
                    // 不硬编码颜色，全部走 lyricTheme
                    return (
                      <span
                        key={wordIdx}
                        className="inline-block relative align-baseline"
                        style={{
                          lineHeight: 'inherit',
                        }}
                      >
                        {/* 底色：显示“未播放色”（进度色） */}
                        <span className="select-none" style={{ color: progressColor }}>
                          {item.text.replace(/\s+$/g, (m) => '\u00A0'.repeat(m.length))}
                        </span>

                        {/* 覆盖层：显示“已播放色”（基底色）并从左到右裁剪 */}
                        {(isWordPast || (isWordActive && progress > 0) || (!isWordPast && !isWordActive && progress > 0)) && (
                          <span
                            className="absolute inset-0 select-none"
                            style={{
                              color: baseColor,
                              clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
                              willChange: 'clip-path',
                              pointerEvents: 'none',
                            }}
                          >
                            {item.text.replace(/\s+$/g, (m) => '\u00A0'.repeat(m.length))}
                          </span>
                        )}
                      </span>
                    )
                  })}
                </div>

                {/* 附加行（翻译或罗马音） */}
                {extraText && (
                  <div
                    className={`${
                      lyricMode === 'translation'
                        ? 'text-sm opacity-90 font-normal leading-relaxed'
                        : 'text-xs opacity-80 italic font-light leading-relaxed'
                    } mt-0.5`}
                    style={{
                      color: isCurrent
                        ? isDark
                          ? lyricTheme.nightOtherText
                          : lyricTheme.dayOtherText
                        : isDark
                          ? lyricTheme.nightOtherText
                          : lyricTheme.dayOtherText,
                    }}
                  >
                    {extraText}
                  </div>
                )}

              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
