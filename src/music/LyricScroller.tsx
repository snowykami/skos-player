import React, { useEffect, useRef, useState } from 'react'
import { getLyricColor, getAlbumCoverColor } from './color'
import { useLyric } from '@/hooks/useLyric'
import { useMusic } from '@/hooks/useMusic'
import { useDevice } from '@/contexts/DeviceContext'
import ThemeModeButtons from './ThemeModeButtons'
import type { LyricLine } from '@/lyric/types'

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

  const [coverColor, setCoverColor] = useState<string>('#888888')

  const { isDark, mode, toggleMode } = useDevice()

  const lyricColor = getLyricColor(coverColor)

  // 封面颜色提取
  useEffect(() => {
    getAlbumCoverColor(currentTrack?.albumPic || '').then((color) => {
      setCoverColor(color || '#888888')
    })
  }, [currentTrack?.albumPic])

  // 自动滚动控制：默认启用；一旦用户手动滚动，则暂时停止自动滚动
  // 当歌词行更新（currentLyricIndex 变化）时，自动回正到当前行
  const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true)
  const isAutoScrollingRef = useRef(false)

  // 切歌时把歌词滚到顶部（而不是沿用上一首歌的滚动位置）
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // 重置对齐与滚动位置
    lastAutoAlignedIndexRef.current = -1
    isAutoScrollingRef.current = true
    container.scrollTop = 0
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false
    })
  }, [currentTrack?.id])

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

  // 两态按钮：译 / 音
  // - 仅当对应轨道存在时显示按钮
  // - 保留 none 状态：再次点击当前已选中的按钮会切回 none
  const isTranslationActive = lyricMode === 'translation'
  const isRomajiActive = lyricMode === 'romaji'

  return (
    <div className="relative h-full flex flex-col">
      {/* 模式按钮：悬浮在歌词区域右下角，竖向排列；再次点击已选中 => 无 */}
      <div className="absolute right-3 bottom-3 z-20">
        <div className="flex flex-col gap-2">
          {hasTranslation && (
            <button
              type="button"
              onClick={() => setLyricMode(isTranslationActive ? 'none' : 'translation')}
              className={`w-9 h-9 text-sm rounded-full transition-all duration-200 flex items-center justify-center ${
                isTranslationActive
                  ? 'shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              style={
                isTranslationActive
                  ? { backgroundColor: isDark ? lyricColor.nightProgress : lyricColor.dayProgress, color: '#fff' }
                  : undefined
              }
              title="翻译"
            >
              译
            </button>
          )}

          {hasRomaji && (
            <button
              type="button"
              onClick={() => setLyricMode(isRomajiActive ? 'none' : 'romaji')}
              className={`w-9 h-9 text-sm rounded-full transition-all duration-200 flex items-center justify-center ${
                isRomajiActive
                  ? 'shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              style={
                isRomajiActive
                  ? { backgroundColor: isDark ? lyricColor.nightProgress : lyricColor.dayProgress, color: '#fff' }
                  : undefined
              }
              title="罗马音"
            >
              音
            </button>
          )}

          <ThemeModeButtons
            mode={mode}
            toggleMode={toggleMode}
            progressColor={isDark ? lyricColor.nightProgress : lyricColor.dayProgress}
          />
        </div>
      </div>

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
            else if (Math.abs(offset) === 2) styleClass = `opacity-85 scale-95 ${offset > 0 ? 'translate-y-4' : '-translate-y-4'} z-0`
            else styleClass = `opacity-80 scale-95 ${offset > 0 ? 'translate-y-6' : '-translate-y-6'} z-0`

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
                      return isDark ? lyricColor.nightUnplayedText : lyricColor.dayUnplayedText
                    }

                    // 按“行结构”判断是否为逐行（无逐字时长信息）：
                    // - 只有一个 item
                    // - 或所有 item.duration <= 0
                    // 满足则整行用进度色，表示“已播放颜色”
                    const isLineLike = sourceType !== 'yrc'
                    if (isLineLike) {
                      return isDark ? lyricColor.nightPlayedText : lyricColor.dayPlayedText
                    }

                    return isDark ? lyricColor.nightPlayedText : lyricColor.dayPlayedText
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

                    // 逐行歌词（无逐字时长）时，让整行直接用“已播放色”
                    // 否则走逐字进度的 clipPath 渐变效果
                    const isLineLike = sourceType !== 'yrc' || line.items.every(it => it.duration <= 0)
                    if (isLineLike) {
                      return (
                        <span
                          key={wordIdx}
                          className="select-none"
                          style={{
                            color: isCurrent
                              ? (isDark ? lyricColor.nightPlayedText : lyricColor.dayPlayedText)
                              : (isDark ? lyricColor.nightUnplayedText : lyricColor.dayUnplayedText),
                          }}
                        >
                          {item.text.replace(/\s+$/g, (m) => '\u00A0'.repeat(m.length))}
                        </span>
                      )
                    }

                    const progress = isCurrent ? getWordProgress(line, wordIdx) : 0
                    const progressColor = isDark ? lyricColor.nightUnplayedText : lyricColor.dayUnplayedText

                    // 互换“已播放/未播放”的视觉：
                    // - 未播放：显示进度色
                    // - 已播放：显示基底色（当前行颜色）
                    const baseColor = isDark ? lyricColor.nightPlayedText : lyricColor.dayPlayedText

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
                        ? 'text-lg opacity-85 font-medium leading-relaxed'
                        : 'text-lg opacity-85 font-medium leading-relaxed'
                    } mt-0.5`}
                    style={{
                      color: isCurrent
                        ? isDark
                          ? lyricColor.nightPlayedText
                          : lyricColor.dayPlayedText
                        : isDark
                          ? lyricColor.nightUnplayedText
                          : lyricColor.dayUnplayedText,
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
