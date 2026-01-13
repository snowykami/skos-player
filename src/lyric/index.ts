/**
 * Lyric Lib - 入口文件
 */

// 解析器函数
export {
  isInstrumental,
  isMetadataLine,
  msToTime,
  parse,
  parseLrc,
  parseRomaji,
  parseTranslation,
  parseYrc,
  timeToMs,
} from './parse'

// 播放器同步接口
export {
  getCurrentLineIndex,
  getCurrentLyrics,
  getHighlightedWordIndices,
  getHighlightProgress,
  getKaraokeProgress,
  getLineWordTimings,
  getNextLineInfo,
  getPreviousLineInfo,
  seekToLine,
  seekToTime,
  syncByTime,
  toggleTrack,
} from './sync'

// 类型导出
export type {
  LyricData,
  LyricItem,
  LyricLine,
  LyricMetadata,
  LyricParseResult,
  LyricState,
  LyricTrack,
  LyricType,
  MetadataType,
  RawLyricResponse,
} from './types'
