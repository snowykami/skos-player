/**
 * Lyric Lib - 入口文件
 */

// 类型导出
export type {
  LyricType,
  MetadataType,
  LyricMetadata,
  LyricItem,
  LyricLine,
  LyricData,
  LyricTrack,
  LyricState,
  LyricParseResult,
  RawLyricResponse,
} from './types';

// 解析器函数
export {
  parseLrc,
  parseYrc,
  parseTranslation,
  parseRomaji,
  parse,
  timeToMs,
  msToTime,
  isInstrumental,
  isMetadataLine,
} from './parse';

// 播放器同步接口
export {
  syncByTime,
  getCurrentLineIndex,
  getCurrentLyrics,
  getHighlightProgress,
  toggleTrack,
  getLineWordTimings,
  getHighlightedWordIndices,
  getKaraokeProgress,
  seekToLine,
  seekToTime,
  getNextLineInfo,
  getPreviousLineInfo,
} from './sync';
