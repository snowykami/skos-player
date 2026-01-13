/**
 * Lyric Lib - 类型定义
 */

/**
 * 歌词类型
 */
export type LyricType = 'line' | 'word';

/**
 * 元数据类型
 */
export type MetadataType =
  | 'lyrics_info' // 作词、作曲、编曲等信息
  | 'production' // 制作人员信息
  | 'other'; // 其他元数据

/**
 * 元数据项
 */
export interface LyricMetadata {
  /** 元数据类型 */
  type: MetadataType;
  /** 出现时间（毫秒） */
  time: number;
  /** 元数据文本内容 */
  text: string;
  /** 附加图片链接（可选） */
  imageUrl?: string;
  /** Orpheus链接（可选） */
  orpheusUrl?: string;
}

/**
 * 歌词内容项（逐字/逐行统一抽象）
 */
export interface LyricItem {
  /** 内容文本 */
  text: string;
  /** 开始时间（毫秒） */
  startTime: number;
  /** 持续时间（毫秒） */
  duration: number;
}

/** 获取歌词项的结束时间 */
export function getLyricItemEndTime(item: LyricItem): number {
  return item.startTime + item.duration;
}

/**
 * 歌词行
 */
export interface LyricLine {
  /** 该行歌词的所有内容项 */
  items: LyricItem[];
  /** 行开始时间（取第一个item的startTime） */
  startTime: number;
  /** 行持续时间（取最后一个item的endTime - 第一个item的startTime） */
  duration: number;
  /** 原始文本（用于回退/调试） */
  originalText: string;
}

/** 获取歌词行的结束时间 */
export function getLyricLineEndTime(line: LyricLine): number {
  return line.startTime + line.duration;
}

/**
 * 解析后的歌词数据
 */
export interface LyricData {
  /** 原始类型：'line' | 'word' */
  type: LyricType;
  /** 歌词行列表（仅实际歌词，不含元数据） */
  lines: LyricLine[];
  /** 翻译歌词（可选） */
  translation?: string[];
  /** 罗马音歌词（可选） */
  romaji?: string[];
}

/**
 * 歌词轨（用于多轨同步）
 */
export interface LyricTrack {
  /** 轨类型 */
  type: 'original' | 'translation' | 'romaji';
  /** 歌词数据 */
  data: LyricData;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 播放器歌词状态
 */
export interface LyricState {
  /** 当前播放时间（毫秒） */
  currentTime: number;
  /** 当前高亮的行索引 */
  currentLineIndex: number;
  /** 当前高亮的字索引（在当前行内） */
  currentWordIndex: number;
  /** 所有歌词轨 */
  tracks: LyricTrack[];
  /** 是否正在播放 */
  isPlaying: boolean;
}

/**
 * 完整解析结果
 */
export interface LyricParseResult {
  /** 歌词状态（用于播放） */
  state: LyricState;
  /** 提取的元数据列表 */
  metadata: LyricMetadata[];
  /** 是否为纯音乐/无人声 */
  isInstrumental: boolean;
  /** 原始歌词类型 */
  sourceType: 'yrc' | 'lrc' | 'none';
}

/**
 * 原始API响应（简化版）
 */
export interface RawLyricResponse {
  lrc?: { lyric: string; version: number } | null;
  tlyric?: { lyric: string; version: number } | null;
  romalrc?: { lyric: string; version: number } | null;
  yrc?: { lyric: string; version: number } | null;
  ytlrc?: { lyric: string; version: number } | null;
  yromalrc?: { lyric: string; version: number } | null;
}

/**
 * JSON格式元数据（网易云歌词开头）
 */
export interface JsonMetadataContent {
  tx: string;
  li?: string;
  or?: string;
}

export interface JsonMetadata {
  t: number;
  c: JsonMetadataContent[];
}
