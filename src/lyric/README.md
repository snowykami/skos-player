# Lyric Lib

一款功能强大的歌词解析库，支持网易云音乐多种歌词格式的解析，包括逐行歌词、逐字歌词、翻译、罗马音等，并提供完整的播放器同步功能。

## 特性

- **多格式支持**：支持 LRC（逐行）和 YRC（逐字）两种歌词格式
- **智能 Fallback**：自动检测并降级，无逐字歌词时使用逐行歌词
- **元数据提取**：自动提取作词、作曲、制作人员等元信息
- **纯音乐检测**：智能识别无人声/纯音乐歌曲
- **多轨同步**：支持原文、翻译、罗马音三种轨道切换
- **卡拉OK效果**：提供逐字高亮进度计算
- **函数式设计**：遵循函数式编程范式，简洁高效

## 安装

```bash
# 克隆项目后直接使用
cd skos-player/src/lyric

# 或者复制文件到你的项目中
```

## 快速开始

```typescript
import { parse, syncByTime, getCurrentLyrics, getKaraokeProgress } from './lyric';

// 1. 从网易云API获取歌词数据
const rawLyricResponse = {
  lrc: { lyric: '[00:00.00]这是一行歌词', version: 1 },
  tlyric: null,
  romalrc: null,
  yrc: null,
  ytlrc: null,
  yromalrc: null,
};

// 2. 解析歌词
const result = parse(rawLyricResponse);

// 3. 检查是否为纯音乐
if (result.isInstrumental) {
  console.log('纯音乐，无歌词');
} else {
  console.log(`解析来源：${result.sourceType}`); // 'yrc' | 'lrc' | 'none'
  console.log(`元数据数量：${result.metadata.length}`);
}

// 4. 在播放器时间更新时同步歌词
function onTimeUpdate(currentTime: number) {
  const state = result.state;

  // 同步当前时间，获取当前行索引
  syncByTime(state, currentTime);

  // 获取当前所有轨道的歌词内容
  const lyrics = getCurrentLyrics(state, currentTime);
  console.log('原文：', lyrics.original);
  console.log('翻译：', lyrics.translation);
  console.log('罗马音：', lyrics.romaji);

  // 获取卡拉OK进度
  const karaoke = getKaraokeProgress(state);
  console.log(`已唱完：${karaoke.highlighted}`);
  console.log(`待唱：${karaoke.remaining}`);
  console.log(`进度：${karaoke.highlightedCount}/${karaoke.totalCount}`);
}
```

## API 参考

### 类型定义

#### LyricType
歌词类型。

```typescript
type LyricType = 'line' | 'word';
```

#### LyricMetadata
元数据项。

```typescript
interface LyricMetadata {
  type: MetadataType;       // 元数据类型：'lyrics_info' | 'production' | 'other'
  time: number;             // 出现时间（毫秒）
  text: string;             // 元数据文本内容
  imageUrl?: string;        // 附加图片链接（可选）
  orpheusUrl?: string;      // Orpheus链接（可选）
}
```

#### LyricItem
歌词内容项（逐字/逐行统一抽象）。

```typescript
interface LyricItem {
  text: string;      // 内容文本
  startTime: number; // 开始时间（毫秒）
  duration: number;  // 持续时间（毫秒）
}
```

#### LyricLine
歌词行。

```typescript
interface LyricLine {
  items: LyricItem[];     // 该行歌词的所有内容项
  startTime: number;      // 行开始时间
  duration: number;       // 行持续时间
  originalText: string;   // 原始文本（用于回退/调试）
}
```

#### LyricData
解析后的歌词数据。

```typescript
interface LyricData {
  type: LyricType;         // 原始类型：'line' | 'word'
  lines: LyricLine[];      // 歌词行列表
  translation?: string[];  // 翻译歌词（可选）
  romaji?: string[];       // 罗马音歌词（可选）
}
```

#### LyricTrack
歌词轨（用于多轨同步）。

```typescript
interface LyricTrack {
  type: 'original' | 'translation' | 'romaji'; // 轨类型
  data: LyricData;                              // 歌词数据
  enabled: boolean;                             // 是否启用
}
```

#### LyricState
播放器歌词状态。

```typescript
interface LyricState {
  currentTime: number;        // 当前播放时间（毫秒）
  currentLineIndex: number;   // 当前高亮的行索引
  currentWordIndex: number;   // 当前高亮的字索引（在当前行内）
  tracks: LyricTrack[];       // 所有歌词轨
  isPlaying: boolean;         // 是否正在播放
}
```

#### LyricParseResult
完整解析结果。

```typescript
interface LyricParseResult {
  state: LyricState;          // 歌词状态（用于播放）
  metadata: LyricMetadata[];  // 提取的元数据列表
  isInstrumental: boolean;    // 是否为纯音乐/无人声
  sourceType: 'yrc' | 'lrc' | 'none'; // 原始歌词类型
}
```

#### RawLyricResponse
原始 API 响应。

```typescript
interface RawLyricResponse {
  lrc?: { lyric: string; version: number } | null;
  tlyric?: { lyric: string; version: number } | null;
  romalrc?: { lyric: string; version: number } | null;
  yrc?: { lyric: string; version: number } | null;
  ytlrc?: { lyric: string; version: number } | null;
  yromalrc?: { lyric: string; version: number } | null;
}
```

### 解析器函数

#### parse
统一解析接口，自动选择最佳格式并处理 Fallback。

```typescript
function parse(rawLyric: RawLyricResponse): LyricParseResult
```

**参数：**
- `rawLyric`：从网易云 API 获取的原始歌词数据对象

**返回值：**
- `LyricParseResult`：包含歌词状态、元数据、纯音乐标记和来源类型

**示例：**
```typescript
const result = parse(apiResponse);
console.log(result.isInstrumental); // 是否为纯音乐
console.log(result.metadata);       // 元数据列表
console.log(result.state);          // 歌词状态
```

#### parseLrc
解析普通逐行歌词。

```typescript
function parseLrc(lrcText: string): LyricData
```

**参数：**
- `lrcText`：LRC 格式的歌词文本

**返回值：**
- `LyricData`：解析后的歌词数据

**示例：**
```typescript
const lrcText = `[00:24.00]歌词内容
[00:29.00]第二行歌词`;

const lyricData = parseLrc(lrcText);
console.log(lyricData.lines.length); // 2
```

#### parseYrc
解析网易云逐字歌词。

```typescript
function parseYrc(yrcText: string): { data: LyricData; metadata: LyricMetadata[] }
```

**参数：**
- `yrcText`：YRC 格式的歌词文本

**返回值：**
- 对象包含：
  - `data`：解析后的歌词数据
  - `metadata`：提取的元数据列表

**示例：**
```typescript
const yrcText = `[24790,3600](24790,360,0)你(25150,170,0)好`;

const { data, metadata } = parseYrc(yrcText);
console.log(data.type);    // 'word'
console.log(data.lines[0].items.length); // 字数
```

#### parseTranslation
解析翻译歌词。

```typescript
function parseTranslation(tlyricText: string): string[]
```

**参数：**
- `tlyricText`：翻译歌词文本（带〖〗包裹）

**返回值：**
- 翻译文本数组

**示例：**
```typescript
const translation = `[00:24.00]〖这是翻译〗`;
parseTranslation(translation); // ['这是翻译']
```

#### parseRomaji
解析罗马音歌词。

```typescript
function parseRomaji(romalrcText: string): string[]
```

**参数：**
- `romalrcText`：罗马音歌词文本

**返回值：**
- 罗马音文本数组

### 播放器同步接口

#### syncByTime
根据时间同步当前歌词状态。

```typescript
function syncByTime(state: LyricState, currentTime: number): number
```

**参数：**
- `state`：歌词状态
- `currentTime`：当前播放时间（毫秒）

**返回值：**
- 当前行索引

**示例：**
```typescript
const lineIndex = syncByTime(state, 30000);
console.log(`当前行：${lineIndex}`);
```

#### getCurrentLyrics
获取当前时间对应的所有轨道歌词内容。

```typescript
function getCurrentLyrics(state: LyricState, currentTime: number): {
  original?: string;
  translation?: string;
  romaji?: string;
}
```

**参数：**
- `state`：歌词状态
- `currentTime`：当前播放时间

**返回值：**
- 各轨道当前内容

**示例：**
```typescript
const lyrics = getCurrentLyrics(state, 30000);
console.log(lyrics.original);   // 当前原文
console.log(lyrics.translation); // 当前翻译
```

#### getHighlightProgress
获取当前行的高亮进度（用于卡拉OK效果）。

```typescript
function getHighlightProgress(state: LyricState, currentTime: number): number
```

**参数：**
- `state`：歌词状态
- `currentTime`：当前播放时间

**返回值：**
- 0 到 1 之间的进度值

**示例：**
```typescript
const progress = getHighlightProgress(state, 30000);
console.log(`进度：${(progress * 100).toFixed(1)}%`);
```

#### getKaraokeProgress
获取逐字卡拉OK进度信息。

```typescript
function getKaraokeProgress(state: LyricState): {
  highlighted: string;    // 已高亮的文本
  remaining: string;      // 待显示的文本
  highlightedCount: number;
  totalCount: number;
}
```

**参数：**
- `state`：歌词状态

**返回值：**
- 卡拉OK进度信息

**示例：**
```typescript
const karaoke = getKaraokeProgress(state);
console.log(`已唱：${karaoke.highlighted}`);
console.log(`待唱：${karaoke.remaining}`);
console.log(`进度：${karaoke.highlightedCount}/${karaoke.totalCount}`);
```

#### toggleTrack
切换轨道启用状态。

```typescript
function toggleTrack(state: LyricState, trackType: LyricTrack['type'], enabled: boolean): LyricState
```

**参数：**
- `state`：歌词状态
- `trackType`：轨道类型：'original' | 'translation' | 'romaji'
- `enabled`：是否启用

**返回值：**
- 更新后的状态

**示例：**
```typescript
// 开启翻译轨道
toggleTrack(state, 'translation', true);

// 关闭罗马音轨道
toggleTrack(state, 'romaji', false);
```

#### getLineWordTimings
获取当前行所有字的时间信息（用于逐字卡拉OK动画）。

```typescript
function getLineWordTimings(state: LyricState, lineIndex: number): LyricItem[]
```

**参数：**
- `state`：歌词状态
- `lineIndex`：行索引

**返回值：**
- 该行所有字的时间信息数组

#### seekToTime
跳转到指定时间。

```typescript
function seekToTime(state: LyricState, time: number): LyricState
```

**参数：**
- `state`：歌词状态
- `time`：目标时间（毫秒）

**返回值：**
- 更新后的状态

#### seekToLine
跳转到指定行。

```typescript
function seekToLine(state: LyricState, lineIndex: number): LyricState
```

**参数：**
- `state`：歌词状态
- `lineIndex`：行索引

**返回值：**
- 更新后的状态

### 工具函数

#### timeToMs
时间字符串转毫秒。

```typescript
function timeToMs(timeStr: string): number
```

**参数：**
- `timeStr`：格式为 `mm:ss.xx` 或 `[mm:ss.xx]`

**返回值：**
- 毫秒数

**示例：**
```typescript
timeToMs('[00:24.00]'); // 24000
timeToMs('[01:30.50]'); // 90500
```

#### msToTime
毫秒转时间字符串。

```typescript
function msToTime(ms: number): string
```

**参数：**
- `ms`：毫秒数

**返回值：**
- 格式为 `mm:ss` 的字符串

**示例：**
```typescript
msToTime(24000);  // '00:24'
msToTime(90500);  // '01:30'
```

#### isInstrumental
检查歌词是否为空（仅含元数据或纯空白）。

```typescript
function isInstrumental(lyricData: LyricData): boolean
```

**参数：**
- `lyricData`：歌词数据

**返回值：**
- 是否为纯音乐/无人声

## Fallback 场景处理

### 场景一：有逐字歌词
使用 `yrc` + `ytlrc` + `yromalrc`，逐字卡拉OK效果生效。

```typescript
const result = parse({
  yrc: { lyric: yrcText, version: 26 },
  ytlrc: { lyric: ytlrcText, version: 4 },
  yromalrc: { lyric: yromalrcText, version: 3 },
});
// result.sourceType === 'yrc'
```

### 场景二：只有逐行歌词
使用 `lrc` + `tlyric` + `romalrc`，降级为逐行模式。

```typescript
const result = parse({
  lrc: { lyric: lrcText, version: 25 },
  tlyric: { lyric: tlyricText, version: 15 },
  romalrc: { lyric: romalrcText, version: 10 },
});
// result.sourceType === 'lrc'
// 卡拉OK效果为逐行高亮
```

### 场景三：纯音乐/无人声
所有歌词字段为空或仅含元数据。

```typescript
const result = parse({
  lrc: { lyric: '', version: 1 },
  yrc: null,
});
// result.isInstrumental === true
// result.sourceType === 'none'
```

### 场景四：元数据与歌词混合
自动分离元数据和歌词。

```typescript
const yrcWithMetadata = `{"t":0,"c":[{"tx":"作词:"},{"tx":"某人"}]}
[28410,4320](28410,270,0)女(28680,180,0)孩...`;

const { data, metadata } = parseYrc(yrcWithMetadata);
// metadata 包含元数据
// data.lines 包含纯歌词
```

## 完整使用示例

```typescript
import {
  parse,
  syncByTime,
  getCurrentLyrics,
  getKaraokeProgress,
  toggleTrack,
  getHighlightProgress,
  type LyricState,
} from './lyric';

// 从API获取歌词数据
async function fetchLyric(songId: number) {
  const response = await fetch(`/api/lyric?id=${songId}`);
  return response.json();
}

// 播放器类示例
class LyricPlayer {
  private state: LyricState;
  private audio: HTMLAudioElement;

  constructor(audio: HTMLAudioElement, rawLyric: any) {
    this.audio = audio;
    const result = parse(rawLyric);

    // 保存元数据
    console.log('元数据：', result.metadata);

    // 设置纯音乐占位
    if (result.isInstrumental) {
      console.log('纯音乐');
    }

    this.state = result.state;

    // 默认开启原文和翻译轨道
    toggleTrack(this.state, 'original', true);
    toggleTrack(this.state, 'translation', true);

    // 绑定时间更新事件
    this.audio.addEventListener('timeupdate', () => {
      this.onTimeUpdate();
    });
  }

  private onTimeUpdate() {
    const currentTime = this.audio.currentTime * 1000; // 转换为毫秒

    // 同步歌词状态
    const lineIndex = syncByTime(this.state, currentTime);

    if (lineIndex >= 0) {
      // 获取当前歌词
      const lyrics = getCurrentLyrics(this.state, currentTime);

      // 更新UI
      this.updateLyricDisplay(lyrics);

      // 获取卡拉OK进度
      const karaoke = getKaraokeProgress(this.state);
      this.updateKaraokeDisplay(karaoke);
    }
  }

  private updateLyricDisplay(lyrics: { original?: string; translation?: string }) {
    // 更新DOM元素显示歌词
    document.getElementById('original')!.textContent = lyrics.original || '';
    document.getElementById('translation')!.textContent = lyrics.translation || '';
  }

  private updateKaraokeDisplay(karaoke: { highlighted: string; remaining: string }) {
    // 实现逐字卡拉OK效果
    const karaokeElement = document.getElementById('karaoke');
    if (karaokeElement) {
      karaokeElement.innerHTML = `
        <span class="highlighted">${karaoke.highlighted}</span>
        <span class="remaining">${karaoke.remaining}</span>
      `;
    }
  }

  toggleTranslation(show: boolean) {
    toggleTrack(this.state, 'translation', show);
  }

  toggleRomaji(show: boolean) {
    toggleTrack(this.state, 'romaji', show);
  }
}
```

## 文件结构

```
src/lyric/
├── index.ts      # 入口文件，统一导出所有API
├── types.ts      # 类型定义
├── parse.ts      # 解析器实现
├── sync.ts       # 播放器同步模块
├── README.md     # 使用文档
└── test.ts       # 测试文件
```

## 协议

MIT License
