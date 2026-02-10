/**
 * Lyric Lib - 解析器实现
 */

import type {
  LyricData,
  LyricItem,
  LyricLine,
  LyricMetadata,
  LyricParseResult,
  LyricState,
  LyricTrack,
  LyricType,
  RawLyricResponse,
} from './types'

/**
 * 时间字符串转毫秒
 * @param timeStr 格式：mm:ss.xx 或 [mm:ss.xx]
 * @returns 毫秒数
 */
export function timeToMs(timeStr: string): number {
  const cleaned = timeStr.replace(/^\[|\]$/g, '')
  const [minutes, rest] = cleaned.split(':')
  const [sec, ms = '0'] = rest.split('.')

  let msValue: number
  if (ms.length === 2) {
    msValue = Number.parseInt(ms, 10) * 10
  }
  else {
    msValue = Number.parseInt(ms.padEnd(3, '0').slice(0, 3), 10)
  }

  return (Number.parseInt(minutes, 10) * 60 + Number.parseInt(sec, 10)) * 1000 + msValue
}

/**
 * 毫秒转时间字符串
 */
export function msToTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * 解析普通逐行歌词
 */
export function parseLrc(lrcText: string): LyricData {
  const lines: LyricLine[] = []
  const lineRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g

  let match
  while ((match = lineRegex.exec(lrcText)) !== null) {
    const [, minutes, seconds, ms, text] = match
    const startTime = (Number.parseInt(minutes, 10) * 60 + Number.parseInt(seconds, 10)) * 1000 + Number.parseInt(ms.padEnd(3, '0'), 10)

    if (text.includes('作词') || text.includes('作曲') || text.includes('编曲') || text.includes('演唱')) {
      continue
    }

    const trimmedText = text.trim()
    if (!trimmedText)
      continue

    lines.push({
      items: [{ text: trimmedText, startTime, duration: 0 }],
      startTime,
      duration: 0,
      originalText: trimmedText,
    })
  }

  lines.sort((a, b) => a.startTime - b.startTime)

  return { type: 'line', lines }
}

/**
 * 解析YRC逐字歌词中的一行
 */
function parseYrcLine(lineText: string): LyricLine | null {
  if (lineText.trim().startsWith('{'))
    return null

  const lineMatch = lineText.match(/^\[(\d+),(\d+)\]/)
  if (!lineMatch)
    return null

  const lineStartTime = Number.parseInt(lineMatch[1], 10)
  const lineDuration = Number.parseInt(lineMatch[2], 10)
  const content = lineText.slice(lineMatch[0].length)
  const items: LyricItem[] = []

  const wordRegex = /\((\d+),(\d+),(\d+)\)([\s\S]*?)(?=\(\d+,\d+,\d+\)|$)/g
  let wordMatch

  while ((wordMatch = wordRegex.exec(content)) !== null) {
    const wordStartTime = Number.parseInt(wordMatch[1], 10)
    const wordDuration = Number.parseInt(wordMatch[2], 10)
    const wordText = wordMatch[4]

    if (wordText) {
      items.push({ text: wordText, startTime: wordStartTime, duration: wordDuration })
    }
  }

  if (items.length === 0)
    return null

  // lineDuration 来自 [start,duration]，但在部分歌词中它可能仅覆盖到“最后一个字结束”，
  // 而下一行 startTime 可能更晚，导致行末出现空窗期。
  // 为了让播放器在“下一行还没到”时保持上一行作为焦点行，这里把行 duration
  // 至少扩展到该行最后一个字的结束时间。
  const last = items[items.length - 1]
  const computedLineDuration = last ? Math.max(lineDuration, (last.startTime + last.duration) - lineStartTime) : lineDuration

  // originalText 用于 UI/MediaSession 回退显示：逐字歌词这里需要按“逐行文本”展示
  // 不能把 YRC 的时间轴标记（例如 (start,dur,0)）带进去
  const lineText = items.map(i => i.text).join('').trim()

  return { items, startTime: lineStartTime, duration: computedLineDuration, originalText: lineText || content }
}

/**
 * 解析网易云逐字歌词
 */
export function parseYrc(yrcText: string): { data: LyricData, metadata: LyricMetadata[] } {
  const lines: LyricLine[] = []
  const metadata: LyricMetadata[] = []

  const yrcLines = yrcText.split('\n')

  for (const lineText of yrcLines) {
    const trimmed = lineText.trim()

    if (trimmed.startsWith('{')) {
      const jsonMetadata = parseMetadataJson(trimmed)
      metadata.push(...jsonMetadata)
      continue
    }

    if (!trimmed)
      continue

    const parsedLine = parseYrcLine(trimmed)
    if (parsedLine) {
      lines.push(parsedLine)
    }
  }

  lines.sort((a, b) => a.startTime - b.startTime)

  return { data: { type: 'word' as LyricType, lines }, metadata }
}

/**
 * 解析JSON格式元数据
 */
function parseMetadataJson(jsonStr: string): LyricMetadata[] {
  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed.t !== undefined && Array.isArray(parsed.c)) {
      return parsed.c.map((item: { tx?: string, li?: string, or?: string }) => ({
        type: 'lyrics_info' as const,
        time: parsed.t,
        text: item.tx || '',
        imageUrl: item.li,
        orpheusUrl: item.or,
      }))
    }
  }
  catch {
    // JSON 解析失败，忽略
  }
  return []
}

/**
 * 解析翻译歌词（带时间戳）
 */
export function parseTranslation(tlyricText: string): LyricData {
  const lines: LyricLine[] = []

  if (!tlyricText)
    return { type: 'line', lines }

  tlyricText.split('\n').forEach((line) => {
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/)
    if (!timeMatch)
      return

    const startTime = (Number.parseInt(timeMatch[1], 10) * 60 + Number.parseInt(timeMatch[2], 10)) * 1000 + Number.parseInt(timeMatch[3].padEnd(3, '0'), 10)

    // 移除时间戳和〖〗包裹符号
    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').replace(/〖|〗/g, '').trim()
    if (!text)
      return

    lines.push({
      items: [{ text, startTime, duration: 0 }],
      startTime,
      duration: 0,
      originalText: text,
    })
  })

  lines.sort((a, b) => a.startTime - b.startTime)

  return { type: 'line', lines }
}

/**
 * 解析罗马音歌词（带时间戳）
 */
export function parseRomaji(romalrcText: string): LyricData {
  const lines: LyricLine[] = []

  if (!romalrcText)
    return { type: 'line', lines }

  romalrcText.split('\n').forEach((line) => {
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/)
    if (!timeMatch)
      return

    const startTime = (Number.parseInt(timeMatch[1], 10) * 60 + Number.parseInt(timeMatch[2], 10)) * 1000 + Number.parseInt(timeMatch[3].padEnd(3, '0'), 10)

    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()
    if (!text)
      return

    lines.push({
      items: [{ text, startTime, duration: 0 }],
      startTime,
      duration: 0,
      originalText: text,
    })
  })

  lines.sort((a, b) => a.startTime - b.startTime)

  return { type: 'line', lines }
}

/**
 * 统一解析接口
 */
export function parse(rawLyric: RawLyricResponse): LyricParseResult {
  let state: LyricState
  let metadata: LyricMetadata[] = []
  let sourceType: 'yrc' | 'lrc' | 'none' = 'none'
  let isInstrumentalFlag = true

  const hasYrc = rawLyric.yrc?.lyric && rawLyric.yrc.lyric.trim()
  const hasLrc = rawLyric.lrc?.lyric && rawLyric.lrc.lyric.trim()
  const hasTranslation = rawLyric.tlyric?.lyric && rawLyric.tlyric.lyric.trim()
  const hasRomaji = rawLyric.romalrc?.lyric && rawLyric.romalrc.lyric.trim()

  if (hasYrc) {
    const yrcResult = parseYrc(rawLyric.yrc!.lyric)
    const translation = hasTranslation ? parseTranslation(rawLyric.tlyric!.lyric) : undefined
    const romaji = hasRomaji ? parseRomaji(rawLyric.romalrc!.lyric) : undefined

    state = createLyricState(yrcResult.data, translation, romaji)
    metadata = yrcResult.metadata
    sourceType = 'yrc'
    isInstrumentalFlag = isInstrumental(yrcResult.data)
  }
  else if (hasLrc) {
    const lrcData = parseLrc(rawLyric.lrc!.lyric)
    const translation = hasTranslation ? parseTranslation(rawLyric.tlyric!.lyric) : undefined
    const romaji = hasRomaji ? parseRomaji(rawLyric.romalrc!.lyric) : undefined

    state = createLyricState(lrcData, translation, romaji)
    sourceType = 'lrc'
    isInstrumentalFlag = isInstrumental(lrcData)
  }
  else {
    state = createLyricState({ type: 'line', lines: [] }, undefined, undefined)
    isInstrumentalFlag = true
  }

  return { state, metadata, isInstrumental: isInstrumentalFlag, sourceType }
}

/**
 * 创建歌词状态
 */
function createLyricState(
  lyricData: LyricData,
  translation?: LyricData,
  romaji?: LyricData,
): LyricState {
  const tracks: LyricTrack[] = [
    { type: 'original', data: lyricData, enabled: true },
  ]

  // 使用翻译数据作为独立的翻译轨道
  if (translation && translation.lines.length > 0) {
    tracks.push({ type: 'translation', data: translation, enabled: false })
  }

  // 使用罗马音数据作为独立的罗马音轨道
  if (romaji && romaji.lines.length > 0) {
    tracks.push({ type: 'romaji', data: romaji, enabled: false })
  }

  return {
    currentTime: 0,
    currentLineIndex: -1,
    currentWordIndex: -1,
    tracks,
    isPlaying: false,
  }
}

/**
 * 检查是否为纯音乐
 */
export function isInstrumental(lyricData: LyricData): boolean {
  if (lyricData.lines.length === 0)
    return true
  return lyricData.lines.every(line => line.items.every(item =>
    item.text.includes('作词')
    || item.text.includes('作曲')
    || item.text.includes('编曲')
    || item.text.includes('制作')
    || !item.text.trim(),
  ))
}

/**
 * 判断是否为元数据行
 */
export function isMetadataLine(line: LyricLine): boolean {
  return line.items.length > 0 && line.items.every(item => item.duration < 50)
}
