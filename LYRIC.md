# Lyric Lib

一款支持多种网易云歌词解析的库，支持逐行/逐字歌词解析及多轨同步（伴奏、罗马音、翻译）。

## 网易云歌词样式

```json
{
  "sgc": false,
  "sfy": false,
  "qfy": false,
  "transUser": {
    "id": 4075274,
    "status": 99,
    "demand": 1,
    "userid": 70038796,
    "nickname": "arasoi",
    "uptime": 1452664362070
  },
  "lyricUser": {
    "id": 4075269,
    "status": 99,
    "demand": 0,
    "userid": 70038796,
    "nickname": "arasoi",
    "uptime": 1452664362070
  },
  "lrc": {
    "version": 25,
    "lyric": "[00:24.00]なぜか悲しい\n[00:29.00]ことがあっても\n..."
  },
  "klyric": {
    "version": 0,
    "lyric": ""
  },
  "tlyric": {
    "version": 15,
    "lyric": "[00:24.00]〖我不懂为什么〗\n[00:29.00]〖即使你在感到〗\n..."
  },
  "romalrc": {
    "version": 10,
    "lyric": "[00:24.00]na ze ka ka na shi i\n[00:29.00]ko to ga a tte mo\n..."
  },
  "yrc": {
    "version": 26,
    "lyric": "{\"t\":0,\"c\":[{\"tx\":\"作词: \"},{\"tx\":\"刘一乐\"}]}\n{\"t\":1000,\"c\":[{\"tx\":\"作曲: \"},{\"tx\":\"刘一乐\"}]}\n{\"t\":2000,\"c\":[{\"tx\":\"编曲: \"},{\"tx\":\"AntChannel_陈超\",\"li\":\"http://...\",\"or\":\"orpheus://...\"}]}\n[28410,4320](28410,270,0)女(28680,180,0)孩..."
  },
  "ytlrc": { "version": 4, "lyric": "..." },
  "yromalrc": { "version": 3, "lyric": "..." },
  "code": 200
}
```

## 字段解释

| 字段 | 类型 | 说明 |
|------|------|------|
| `lrc` | string | 普通逐行歌词 |
| `tlyric` | string | 翻译逐行歌词（带〖〗包裹） |
| `romalrc` | string | 罗马音逐行歌词 |
| `yrc` | string | 网易云**逐字歌词**（高精度，带每个字的时间戳） |
| `ytlrc` | string | 网易云逐字翻译歌词（逐字版翻译） |
| `yromalrc` | string | 网易云逐字罗马音歌词（逐字版罗马音） |

## 歌词格式详解

### 1. 普通逐行歌词 (LRC)

```
[mm:ss.xx]歌词文本
```

- `mm`: 分钟（2位）
- `ss`: 秒（2位）
- `xx`: 百分秒（2位）
- 示例：`[00:24.00]なぜか悲しい`

### 2. 逐字歌词 (YRC)

```
[行开始时间,行持续时间](字开始时间,字持续时间,空格时间)文字...
```

**格式说明：**
```
[24790,3600](24790,360,0)な(25150,170,0)ぜ(25320,1040,0)か
   │      │        │     │   │              │
   │      │        │     │   └─── 空格时间（毫秒）
   │      │        │     └────── 字持续时间（毫秒）
   │      │        └─────────── 字开始时间（毫秒）
   │      └────────────────── 行持续时间（毫秒）
   └───────────────────────── 行开始时间（毫秒）
```

**时间精度：** 毫秒（ms）

- 行开始时间：本行歌词开始的时间戳
- 行持续时间：本行歌词的总时长
- 字开始时间：当前字开始的时间戳（相对于歌曲开头）
- 字持续时间：当前字演唱的时长
- 空格时间：当前字演唱后的停顿时间

### 3. 元数据 (Metadata)

网易云歌词中可能包含元数据，需要单独提取：

#### 3.1 JSON格式元数据（位于歌词开头）

```json
{"t":0,"c":[{"tx":"作词: "},{"tx":"刘一乐"}]}
{"t":1000,"c":[{"tx":"作曲: "},{"tx":"刘一乐"}]}
{"t":2000,"c":[{"tx":"编曲: "},{"tx":"AntChannel_陈超","li":"http://...","or":"orpheus://..."}]}
```

- `t`: 时间戳（毫秒）
- `c`: 内容数组，每个元素包含：
  - `tx`: 文本内容
  - `li`: 图片链接（可选）
  - `or`: Orpheus链接（可选）

#### 3.2 逐字格式元数据（位于歌词结尾）

```
[291850,600](291850,40,0)制(291890,40,0)作(291930,40,0)人(291970,40,0):(292050,40,0)AntChannel...
```

制作人员信息、混音师、监制等，通常是极短时长（40ms）的连续文字。

## Fallback 场景处理

| 场景 | 处理方式 |
|------|----------|
| **有逐字歌词** | 使用 `yrc` + `ytlrc` + `yromalrc` |
| **只有逐行歌词** | 使用 `lrc` + `tlyric` + `romalrc`，降级为逐行模式 |
| **纯音乐/无人声** | `lrc` 和 `yrc` 均为空或仅含元数据，返回空歌词 |
| **完全没有歌词** | 所有字段为空或 null，返回空歌词 |
| **元数据与歌词混合** | 提取元数据，歌词部分正常解析 |

**解析优先级：**
```
yrc (逐字) → lrc (逐行)
ytlrc → tlyric
yromalrc → romalrc
```

## 解析器输出数据结构

```typescript
/**
 * 歌词类型
 */
export type LyricType = 'line' | 'word'

/**
 * 元数据类型
 */
export type MetadataType
  = | 'lyrics_info' // 作词、作曲、编曲等信息
    | 'production' // 制作人员信息
    | 'other' // 其他元数据

/**
 * 元数据项
 */
export interface LyricMetadata {
  /** 元数据类型 */
  type: MetadataType
  /** 出现时间（毫秒） */
  time: number
  /** 元数据文本内容 */
  text: string
  /** 附加图片链接（可选） */
  imageUrl?: string
  /** Orpheus链接（可选） */
  orpheusUrl?: string
}

/**
 * 歌词内容项（逐字/逐行统一抽象）
 */
export interface LyricItem {
  /** 内容文本 */
  text: string
  /** 开始时间（毫秒） */
  startTime: number
  /** 持续时间（毫秒） */
  duration: number
}

/**
 * 歌词行
 */
export interface LyricLine {
  /** 该行歌词的所有内容项 */
  items: LyricItem[]
  /** 行开始时间（取第一个item的startTime） */
  startTime: number
  /** 行持续时间（取最后一个item的endTime - 第一个item的startTime） */
  duration: number
  /** 原始文本（用于回退/调试） */
  originalText: string
}

/**
 * 解析后的歌词数据
 */
export interface LyricData {
  /** 原始类型：'line' | 'word' */
  type: LyricType
  /** 歌词行列表（仅实际歌词，不含元数据） */
  lines: LyricLine[]
  /** 翻译歌词（可选） */
  translation?: string[]
  /** 罗马音歌词（可选） */
  romaji?: string[]
}

/**
 * 歌词轨（用于多轨同步）
 */
export interface LyricTrack {
  /** 轨类型 */
  type: 'original' | 'translation' | 'romaji'
  /** 歌词数据 */
  data: LyricData
  /** 是否启用 */
  enabled: boolean
}

/**
 * 播放器歌词状态
 */
export interface LyricState {
  /** 当前播放时间（毫秒） */
  currentTime: number
  /** 当前高亮的行索引 */
  currentLineIndex: number
  /** 当前高亮的字索引（在当前行内） */
  currentWordIndex: number
  /** 所有歌词轨 */
  tracks: LyricTrack[]
  /** 是否正在播放 */
  isPlaying: boolean
}

/**
 * 完整解析结果
 */
export interface LyricParseResult {
  /** 歌词状态（用于播放） */
  state: LyricState
  /** 提取的元数据列表 */
  metadata: LyricMetadata[]
  /** 是否为纯音乐/无人声 */
  isInstrumental: boolean
  /** 原始歌词类型 */
  sourceType: 'yrc' | 'lrc' | 'none'
}

/**
 * 原始API响应（简化版）
 */
export interface RawLyricResponse {
  lrc?: { lyric: string, version: number }
  tlyric?: { lyric: string, version: number }
  romalrc?: { lyric: string, version: number }
  yrc?: { lyric: string, version: number }
  ytlrc?: { lyric: string, version: number }
  yromalrc?: { lyric: string, version: number }
}
```

## API 接口设计

### 解析器函数

```typescript
/**
 * 解析普通逐行歌词
 * @param lrcText lrc格式歌词文本
 * @returns 解析后的LyricData
 */
export function parseLrc(lrcText: string): LyricData

/**
 * 解析网易云逐字歌词
 * @param yrcText yrc格式歌词文本
 * @returns 解析后的LyricData + 元数据数组
 */
export function parseYrc(yrcText: string): { data: LyricData, metadata: LyricMetadata[] }

/**
 * 解析翻译歌词
 * @param tlyricText 翻译歌词文本（带〖〗）
 * @returns 翻译文本数组
 */
export function parseTranslation(tlyricText: string): string[]

/**
 * 解析罗马音歌词
 * @param romalrcText 罗马音歌词文本
 * @returns 罗马音文本数组
 */
export function parseRomaji(romalrcText: string): string[]

/**
 * 统一解析接口（自动选择最佳格式，处理fallback）
 * @param rawLyric 原始歌词数据对象
 * @returns 完整的解析结果
 */
export function parse(rawLyric: RawLyricResponse): LyricParseResult
```

### 播放器同步接口

```typescript
/**
 * 根据时间获取当前歌词状态
 * @param state 歌词状态
 * @param currentTime 当前播放时间（毫秒）
 * @returns 更新后的当前行/字索引
 */
export function syncByTime(state: LyricState, currentTime: number): LyricState['currentLineIndex']

/**
 * 获取当前时间对应的所有轨道的歌词内容
 * @param state 歌词状态
 * @param currentTime 当前播放时间
 * @returns 各轨道当前内容
 */
export function getCurrentLyrics(state: LyricState, currentTime: number): {
  original?: string
  translation?: string
  romaji?: string
}

/**
 * 获取当前行的高亮进度（用于卡拉OK效果）
 * @param state 歌词状态
 * @param currentTime 当前播放时间
 * @returns 0-1之间的进度值
 */
export function getHighlightProgress(state: LyricState, currentTime: number): number

/**
 * 切换轨道启用状态
 * @param state 歌词状态
 * @param trackType 轨道类型
 * @param enabled 是否启用
 * @returns 更新后的状态
 */
export function toggleTrack(state: LyricState, trackType: LyricTrack['type'], enabled: boolean): LyricState

/**
 * 获取当前行的所有字的时间信息（用于逐字卡拉OK）
 * @param state 歌词状态
 * @param lineIndex 行索引
 * @returns 该行所有字的时间信息数组
 */
export function getLineWordTimings(state: LyricState, lineIndex: number): LyricItem[]
```

### 工具函数

```typescript
/**
 * 时间字符串转毫秒
 * @param timeStr 格式：mm:ss.xx 或 [mm:ss.xx]
 * @returns 毫秒数
 */
export function timeToMs(timeStr: string): number

/**
 * 毫秒转时间字符串
 * @param ms 毫秒数
 * @returns 格式：mm:ss
 */
export function msToTime(ms: number): string

/**
 * 检查歌词是否为空（仅含元数据或纯空白）
 * @param lyricData 歌词数据
 * @returns 是否为纯音乐/无人声
 */
export function isInstrumental(lyricData: LyricData): boolean

/**
 * 判断是否为元数据行（极短时长的连续文字）
 * @param line 歌词行
 * @returns 是否为元数据行
 */
export function isMetadataLine(line: LyricLine): boolean
```

## 内部辅助函数

```typescript
/**
 * 解析JSON格式元数据
 * @param jsonStr JSON字符串
 * @returns 解析后的元数据
 */
function parseMetadataJson(jsonStr: string): LyricMetadata[]

/**
 * 检测并过滤元数据行
 * @param lines 歌词行列表
 * @returns 过滤后的纯歌词行 + 检测到的元数据行
 */
function filterMetadataLines(lines: LyricLine[]): {
  lyrics: LyricLine[]
  metadata: LyricLine[]
}
```

## 使用示例

```typescript
import { getCurrentLyrics, getHighlightProgress, isInstrumental, parse, syncByTime } from './lyric'

// 1. 解析歌词（自动fallback）
const rawLyric = { /* 从API获取的原始数据 */ }
const result = parse(rawLyric)

// 检查是否为纯音乐
if (result.isInstrumental) {
  console.log('纯音乐/无人声歌词')
}
else {
  console.log('解析来源:', result.sourceType) // 'yrc' | 'lrc' | 'none'
  console.log('元数据数量:', result.metadata.length)
}

// 2. 播放器同步（每帧调用）
function onTimeUpdate(currentTime: number) {
  const state = result.state
  const lineIndex = syncByTime(state, currentTime)
  const currentLyrics = getCurrentLyrics(state, currentTime)
  const progress = getHighlightProgress(state, currentTime)

  console.log('当前行:', lineIndex)
  console.log('原文:', currentLyrics.original)
  console.log('翻译:', currentLyrics.translation)
  console.log('罗马音:', currentLyrics.romaji)
  console.log('卡拉OK进度:', `${(progress * 100).toFixed(1)}%`)
}

// 3. 切换轨道
const newState = toggleTrack(state, 'translation', true)
const romajiState = toggleTrack(state, 'romaji', true)
```

## 规范

- 使用TypeScript进行开发
- 使用ESLint进行代码规范检查
- 歌词解析器放到`src/lyric`目录下
- 遵循函数式编程范式，使用 `functional + interface` 设计模式
- 所有时间单位统一为**毫秒（ms）**
- 元数据与歌词分离存储
- 自动处理各种fallback场景
