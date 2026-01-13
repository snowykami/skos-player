/**
 * Lyric Lib - 播放器同步模块
 */

import type { LyricItem, LyricState, LyricTrack } from './types'

/**
 * 根据时间获取当前歌词状态（纯函数，不修改原状态）
 * @param state 歌词状态
 * @param currentTime 当前播放时间（毫秒）
 * @returns 更新后的歌词状态
 */
export function syncByTime(state: LyricState, currentTime: number): LyricState {
  const originalTrack = state.tracks.find(t => t.type === 'original')
  let lineIndex = -1
  let wordIndex = -1

  if (originalTrack && originalTrack.data.lines.length > 0) {
    const lines = originalTrack.data.lines

    // 二分查找当前行
    let left = 0
    let right = lines.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const line = lines[mid]
      const nextLine = lines[mid + 1]

      // NOTE:
      // - LRC/逐行歌词解析时 line.duration 可能为 0
      // - YRC/逐字歌词一般带有 duration
      // 因此这里用“下一行 startTime”作为兜底的行结束时间，避免永远匹配不到当前行
      const lineEndTime = line.duration > 0
        ? line.startTime + line.duration
        : (nextLine ? nextLine.startTime : Number.POSITIVE_INFINITY)

      if (currentTime >= line.startTime && currentTime < lineEndTime) {
        // 逐字歌词的“焦点行”策略：
        // 如果已经到达下一行的 startTime，则 currentTime 会自然命中下一行；
        // 否则在当前行结束（最后一个字结束）到下一行开始之间，保持当前行不切换。
        lineIndex = mid

        // 在当前行内查找当前字
        for (let i = 0; i < line.items.length; i++) {
          const item = line.items[i]
          const itemEndTime = item.startTime + item.duration
          if (currentTime < itemEndTime) {
            wordIndex = i
            break
          }
          if (i === line.items.length - 1) {
            wordIndex = i
          }
        }

        // 如果当前时间已经超过当前行最后一个字的结束时间但还没到下一行开始，
        // 仍保持此行为焦点行，wordIndex 固定为最后一个字。
        if (line.items.length > 0) {
          const lastItem = line.items[line.items.length - 1]
          const lastItemEndTime = lastItem.startTime + lastItem.duration
          if (currentTime >= lastItemEndTime && nextLine && currentTime < nextLine.startTime) {
            wordIndex = line.items.length - 1
          }
        }

        break
      }

      if (currentTime < line.startTime) {
        right = mid - 1
      }
      else {
        left = mid + 1
      }
    }
  }

  // 如果未命中任何行：保持上一行作为焦点行，直到下一行 startTime
  // 这用于处理逐字歌词“行末空窗期”（最后一个字唱完到下一行开始之间）
  if (lineIndex < 0 && state.currentLineIndex >= 0) {
    const originalTrack = state.tracks.find(t => t.type === 'original')
    const lines = originalTrack?.data.lines
    const prevLine = lines?.[state.currentLineIndex]
    const nextLine = lines?.[state.currentLineIndex + 1]

    if (prevLine) {
      const prevEnd = prevLine.startTime + prevLine.duration
      // 只在“已经进入上一行（或行尾）且下一行未到”的区间保持
      if (currentTime >= prevLine.startTime && (nextLine ? currentTime < nextLine.startTime : currentTime >= prevEnd)) {
        lineIndex = state.currentLineIndex
        // 逐字：保持最后一个字
        if (prevLine.items.length > 0) {
          wordIndex = prevLine.items.length - 1
        }
      }
    }
  }

  return {
    ...state,
    currentTime,
    currentLineIndex: lineIndex,
    currentWordIndex: wordIndex,
  }
}

/**
 * 获取当前行索引（兼容旧用法）
 * @param state 歌词状态
 * @param currentTime 当前播放时间（毫秒）
 * @returns 更新后的当前行索引
 */
export function getCurrentLineIndex(state: LyricState, currentTime: number): number {
  const syncedState = syncByTime(state, currentTime)
  return syncedState.currentLineIndex
}

/**
 * 获取当前时间对应的所有轨道的歌词内容
 * @param state 歌词状态
 * @param currentTime 当前播放时间
 * @returns 各轨道当前内容
 */
export function getCurrentLyrics(
  state: LyricState,
): {
  original?: string
  translation?: string
  romaji?: string
} {
  const lineIndex = state.currentLineIndex
  if (lineIndex < 0) {
    return {}
  }

  const result: { original?: string, translation?: string, romaji?: string } = {}

  for (const track of state.tracks) {
    if (!track.enabled || track.data.lines.length === 0)
      continue

    const line = track.data.lines[lineIndex]
    if (!line)
      continue

    // 获取该行的所有文本
    const text = line.items.map(item => item.text).join('')

    switch (track.type) {
      case 'original':
        result.original = text
        break
      case 'translation':
        result.translation = text
        break
      case 'romaji':
        result.romaji = text
        break
    }
  }

  return result
}

/**
 * 获取当前行的高亮进度（用于卡拉OK效果）
 * @param state 歌词状态
 * @param currentTime 当前播放时间
 * @returns 0-1之间的进度值
 */
export function getHighlightProgress(state: LyricState, currentTime: number): number {
  const lineIndex = state.currentLineIndex
  if (lineIndex < 0)
    return 0

  const originalTrack = state.tracks.find(t => t.type === 'original')
  if (!originalTrack)
    return 0

  const line = originalTrack.data.lines[lineIndex]
  if (!line || line.items.length === 0)
    return 0

  // 计算当前行的进度
  const lineStartTime = line.startTime
  const elapsed = currentTime - lineStartTime
  const progress = Math.max(0, Math.min(1, elapsed / line.duration))

  return progress
}

/**
 * 切换轨道启用状态
 * @param state 歌词状态
 * @param trackType 轨道类型
 * @param enabled 是否启用
 * @returns 更新后的状态
 */
export function toggleTrack(state: LyricState, trackType: LyricTrack['type'], enabled: boolean): LyricState {
  const track = state.tracks.find(t => t.type === trackType)
  if (track) {
    track.enabled = enabled
  }
  return state
}

/**
 * 获取当前行的所有字的时间信息（用于逐字卡拉OK）
 * @param state 歌词状态
 * @param lineIndex 行索引
 * @returns 该行所有字的时间信息数组
 */
export function getLineWordTimings(state: LyricState, lineIndex: number): LyricItem[] {
  const originalTrack = state.tracks.find(t => t.type === 'original')
  if (!originalTrack)
    return []

  const line = originalTrack.data.lines[lineIndex]
  if (!line)
    return []

  return line.items
}

/**
 * 获取当前行的高亮字索引列表（用于逐字高亮）
 * @param state 歌词状态
 * @returns 已高亮的字索引数组
 */
export function getHighlightedWordIndices(state: LyricState): number[] {
  if (state.currentLineIndex < 0 || state.currentWordIndex < 0) {
    return []
  }

  // 返回所有已唱完的字索引
  const indices: number[] = []
  const originalTrack = state.tracks.find(t => t.type === 'original')
  if (!originalTrack)
    return indices

  const line = originalTrack.data.lines[state.currentLineIndex]
  if (!line)
    return indices

  for (let i = 0; i <= state.currentWordIndex; i++) {
    const item = line.items[i]
    if (item) {
      const itemEndTime = item.startTime + item.duration
      if (state.currentTime >= itemEndTime) {
        indices.push(i)
      }
    }
  }

  return indices
}

/**
 * 获取当前行的进度信息（逐字卡拉OK专用）
 * @param state 歌词状态
 * @returns 包含已高亮文本和待显示文本的对象
 */
export function getKaraokeProgress(state: LyricState): {
  highlighted: string
  remaining: string
  highlightedCount: number
  totalCount: number
} {
  const lineIndex = state.currentLineIndex
  if (lineIndex < 0) {
    return { highlighted: '', remaining: '', highlightedCount: 0, totalCount: 0 }
  }

  const originalTrack = state.tracks.find(t => t.type === 'original')
  if (!originalTrack) {
    return { highlighted: '', remaining: '', highlightedCount: 0, totalCount: 0 }
  }

  const line = originalTrack.data.lines[lineIndex]
  if (!line) {
    return { highlighted: '', remaining: '', highlightedCount: 0, totalCount: 0 }
  }

  const items = line.items
  let highlighted = ''
  let remaining = ''
  let highlightedCount = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemEndTime = item.startTime + item.duration

    if (state.currentTime >= itemEndTime) {
      highlighted += item.text
      highlightedCount++
    }
    else {
      remaining += item.text
    }
  }

  return {
    highlighted,
    remaining,
    highlightedCount,
    totalCount: items.length,
  }
}

/**
 * 跳转到指定行
 * @param state 歌词状态
 * @param lineIndex 行索引
 * @returns 更新后的状态
 */
export function seekToLine(state: LyricState, lineIndex: number): LyricState {
  if (lineIndex < 0 || lineIndex >= state.tracks[0]?.data.lines.length) {
    return state
  }

  const line = state.tracks[0].data.lines[lineIndex]
  state.currentTime = line.startTime
  state.currentLineIndex = lineIndex
  state.currentWordIndex = -1

  return state
}

/**
 * 跳转到指定时间
 * @param state 歌词状态
 * @param time 目标时间（毫秒）
 * @returns 更新后的状态
 */
export function seekToTime(state: LyricState, time: number): LyricState {
  return syncByTime(state, time)
}

/**
 * 获取下一行歌词的信息
 * @param state 歌词状态
 * @return 下一行信息或null
 */
export function getNextLineInfo(state: LyricState): { startTime: number, text: string } | null {
  const nextIndex = state.currentLineIndex + 1
  const originalTrack = state.tracks.find(t => t.type === 'original')

  if (!originalTrack || nextIndex >= originalTrack.data.lines.length) {
    return null
  }

  const nextLine = originalTrack.data.lines[nextIndex]
  const text = nextLine.items.map(item => item.text).join('')

  return {
    startTime: nextLine.startTime,
    text,
  }
}

/**
 * 获取上一行歌词的信息
 * @param state 歌词状态
 * @return 上一行信息或null
 */
export function getPreviousLineInfo(state: LyricState): { endTime: number, text: string } | null {
  const prevIndex = state.currentLineIndex - 1
  const originalTrack = state.tracks.find(t => t.type === 'original')

  if (!originalTrack || prevIndex < 0) {
    return null
  }

  const prevLine = originalTrack.data.lines[prevIndex]
  const text = prevLine.items.map(item => item.text).join('')

  return {
    endTime: prevLine.startTime + prevLine.duration,
    text,
  }
}
