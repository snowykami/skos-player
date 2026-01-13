/**
 * Lyric Lib - 测试文件
 * 使用 LYRIC.md 中的示例数据进行测试
 */

import {
  parse,
  parseLrc,
  parseYrc,
  parseTranslation,
  syncByTime,
  getCurrentLyrics,
  getHighlightProgress,
  toggleTrack,
  getKaraokeProgress,
  timeToMs,
  msToTime,
  type RawLyricResponse,
} from './index';

// ============================================================================
// 测试数据 - 来自 LYRIC.md
// ============================================================================

// 测试1: 完整的逐行歌词
const testLrc = `[00:24.00]なぜか悲しい
[00:29.00]ことがあっても
[00:34.00]笑ってみせる
[00:38.00]あなたを見てた
[00:46.50]"not found..." ah まるで
[00:51.00]知らない気持ち
[00:56.00]あなたがくれたたくさんのメモリー
[01:06.00]揺れる心 プラトニック`;

// 测试2: 翻译歌词
const testTranslation = `[00:24.00]〖我不懂为什么〗
[00:29.00]〖即使你在感到〗
[00:34.00]〖悲伤的时候也〗
[00:38.00]〖可以露出笑容〗`;

// 测试3: 逐字歌词（简化版，用于测试）
const testYrc = `[24790,3600](24790,360,0)な(25150,170,0)ぜ(25320,1040,0)か(26360,690,0)悲(27050,340,0)し(27390,1000,0)い
[29640,3220](29640,350,0)こ(29990,160,0)와(30150,190,0)가(30340,1320,0)あ(31660,280,0)っ(31940,340,0)て(32280,580,0)も
[34440,3250](34440,910,0)笑(35350,610,0)っ(35960,250,0)て(36210,460,0)み(36670,480,0)せ(37150,540,0)る`;

// 测试4: 带元数据的YRC歌词
const testYrcWithMetadata = `{"t":0,"c":[{"tx":"作词: "},{"tx":"刘一乐"}]}
{"t":1000,"c":[{"tx":"作曲: "},{"tx":"刘一乐"}]}
{"t":2000,"c":[{"tx":"编曲: "},{"tx":"AntChannel_陈超","li":"http://p1.music.126.net/...","or":"orpheus://..."}]}
[28410,4320](28410,270,0)女(28680,180,0)孩(28860,150,0)你(29010,240,0)为(29250,300,0)何(29550,250,0)踮(29800,340,0)脚(30140,220,0)尖(30360,200,0)
[32950,4380](32950,300,0)马(33250,200,0)戏(33450,120,0)团(33570,280,0)世(33850,230,0)界(34080,320,0)很(34400,230,0)善(34630,340,0)变(34970,190,0)`;

// 测试6: 纯音乐（空歌词）
const emptyLyric: RawLyricResponse = {
  lrc: { lyric: '', version: 1 },
  tlyric: null,
  romalrc: null,
  yrc: null,
  ytlrc: null,
  yromalrc: null,
};

// 测试7: 只有逐行歌词（无逐字）
const lrcOnlyLyric: RawLyricResponse = {
  lrc: { lyric: testLrc, version: 1 },
  tlyric: { lyric: testTranslation, version: 1 },
  romalrc: null,
  yrc: null,
  ytlrc: null,
  yromalrc: null,
};

// 测试8: 有逐字歌词
const yrcLyric: RawLyricResponse = {
  lrc: null,
  tlyric: null,
  romalrc: null,
  yrc: { lyric: testYrcWithMetadata, version: 26 },
  ytlrc: null,
  yromalrc: null,
};

// ============================================================================
// 测试函数
// ============================================================================

function runTests() {
  console.log('='.repeat(60));
  console.log('Lyric Lib 测试开始');
  console.log('='.repeat(60));

  // 测试工具函数
  testUtilityFunctions();

  // 测试LRC解析
  testLrcParsing();

  // 测试YRC解析
  testYrcParsing();

  // 测试翻译解析
  testTranslationParsing();

  // 测试元数据解析
  testMetadataParsing();

  // 测试纯音乐检测
  testInstrumentalDetection();

  // 测试完整解析
  testFullParsing();

  // 测试播放器同步
  testSyncFunctionality();

  console.log('='.repeat(60));
  console.log('所有测试完成！');
  console.log('='.repeat(60));
}

function testUtilityFunctions() {
  console.log('\n--- 测试工具函数 ---');

  // timeToMs 测试
  const testCases = [
    { input: '[00:00.00]', expected: 0 },
    { input: '[00:24.00]', expected: 24000 },
    { input: '[01:30.50]', expected: 90500 },
    { input: '[00:00.123]', expected: 123 },
  ];

  for (const { input, expected } of testCases) {
    const result = timeToMs(input);
    const pass = result === expected;
    console.log(`  timeToMs('${input}') = ${result}, expected ${expected} -> ${pass ? '✓' : '✗'}`);
  }

  // msToTime 测试
  const msTestCases = [
    { input: 0, expected: '00:00' },
    { input: 24000, expected: '00:24' },
    { input: 90500, expected: '01:30' },
  ];

  for (const { input, expected } of msTestCases) {
    const result = msToTime(input);
    const pass = result === expected;
    console.log(`  msToTime(${input}) = '${result}', expected '${expected}' -> ${pass ? '✓' : '✗'}`);
  }
}

function testLrcParsing() {
  console.log('\n--- 测试LRC解析 ---');

  const result = parseLrc(testLrc);

  console.log(`  解析结果类型: ${result.type}`);
  console.log(`  行数: ${result.lines.length}`);

  // 验证第一行
  if (result.lines.length > 0) {
    const firstLine = result.lines[0];
    console.log(`  第一行: "${firstLine.originalText}"`);
    console.log(`  第一行时间: ${firstLine.startTime}ms`);
  }

  // 验证逐行排序
  let sorted = true;
  for (let i = 1; i < result.lines.length; i++) {
    if (result.lines[i].startTime < result.lines[i - 1].startTime) {
      sorted = false;
      break;
    }
  }
  console.log(`  时间排序正确: ${sorted ? '✓' : '✗'}`);
}

function testYrcParsing() {
  console.log('\n--- 测试YRC解析 ---');

  const result = parseYrc(testYrc);

  console.log(`  解析结果类型: ${result.data.type}`);
  console.log(`  行数: ${result.data.lines.length}`);
  console.log(`  元数据数: ${result.metadata.length}`);

  // 验证第一行
  if (result.data.lines.length > 0) {
    const firstLine = result.data.lines[0];
    const text = firstLine.items.map((i) => i.text).join('');
    console.log(`  第一行文本: "${text}"`);
    console.log(`  第一行时间: ${firstLine.startTime}ms, 持续: ${firstLine.duration}ms`);
    console.log(`  第一行字数: ${firstLine.items.length}`);
  }
}

function testTranslationParsing() {
  console.log('\n--- 测试翻译解析 ---');

  const result = parseTranslation(testTranslation);

  console.log(`  解析行数: ${result.lines.length}`);
  console.log(`  第一行: "${result.lines[0]?.items.map(i => i.text).join('') ?? ''}"`);
  console.log(`  第二行: "${result.lines[1]?.items.map(i => i.text).join('') ?? ''}"`);
}

function testMetadataParsing() {
  console.log('\n--- 测试元数据解析 ---');

  const result = parseYrc(testYrcWithMetadata);

  console.log(`  提取的元数据数: ${result.metadata.length}`);
  for (const meta of result.metadata) {
    console.log(`    - 类型: ${meta.type}, 时间: ${meta.time}ms, 内容: "${meta.text}"`);
  }
}

function testInstrumentalDetection() {
  console.log('\n--- 测试纯音乐检测 ---');

  // 测试空歌词
  const emptyResult = parse(emptyLyric);
  console.log(`  空歌词 isInstrumental: ${emptyResult.isInstrumental} -> ${emptyResult.isInstrumental ? '✓' : '✗'}`);

  // 测试有效歌词
  const validResult = parse(lrcOnlyLyric);
  console.log(`  有效歌词 isInstrumental: ${validResult.isInstrumental} -> ${!validResult.isInstrumental ? '✓' : '✗'}`);
}

function testFullParsing() {
  console.log('\n--- 测试完整解析 ---');

  // 测试仅有逐行歌词
  console.log('\n  [场景1: 仅有逐行歌词]');
  const result1 = parse(lrcOnlyLyric);
  console.log(`    来源类型: ${result1.sourceType}`);
  console.log(`    歌词类型: ${result1.state.tracks[0].data.type}`);
  console.log(`    翻译轨道: ${result1.state.tracks.find((t) => t.type === 'translation') ? '✓' : '✗'}`);
  console.log(`    轨道数: ${result1.state.tracks.length}`);

  // 测试有逐字歌词
  console.log('\n  [场景2: 有逐字歌词]');
  const result2 = parse(yrcLyric);
  console.log(`    来源类型: ${result2.sourceType}`);
  console.log(`    歌词类型: ${result2.state.tracks[0].data.type}`);
  console.log(`    元数据数: ${result2.metadata.length}`);
}

function testSyncFunctionality() {
  console.log('\n--- 测试播放器同步功能 ---');

  const result = parse(yrcLyric);
  const state = result.state;

  // 测试syncByTime
  console.log('\n  [syncByTime 测试]');

  // 测试时间在第一行之前
  let syncedState = syncByTime(state, 20000);
  console.log(`    时间 20000ms -> 行索引: ${syncedState.currentLineIndex}`);

  // 测试时间在第一行
  syncedState = syncByTime(syncedState, 25000);
  console.log(`    时间 25000ms -> 行索引: ${syncedState.currentLineIndex}`);

  // 测试时间在第二行
  syncedState = syncByTime(syncedState, 30000);
  console.log(`    时间 30000ms -> 行索引: ${syncedState.currentLineIndex}`);

  // 测试getCurrentLyrics
  console.log('\n  [getCurrentLyrics 测试]');
  syncedState = syncByTime(syncedState, 29000);
  const lyrics = getCurrentLyrics(syncedState);
  console.log(`    当前歌词: ${lyrics.original || '(无)'}`);

  // 测试getHighlightProgress
  console.log('\n  [getHighlightProgress 测试]');
  const progress = getHighlightProgress(syncedState, 29000);
  console.log(`    进度: ${(progress * 100).toFixed(1)}%`);

  // 测试toggleTrack
  console.log('\n  [toggleTrack 测试]');
  const track = syncedState.tracks.find((t) => t.type === 'translation');
  if (track) {
    console.log(`    翻译轨道初始状态: enabled=${track.enabled}`);
    toggleTrack(syncedState, 'translation', true);
    console.log(`    切换后状态: enabled=${track.enabled}`);
  }

  // 测试getKaraokeProgress
  console.log('\n  [getKaraokeProgress 测试]');
  const karaoke = getKaraokeProgress(syncedState);
  console.log(`    已高亮: "${karaoke.highlighted}"`);
  console.log(`    待显示: "${karaoke.remaining}"`);
  console.log(`    进度: ${karaoke.highlightedCount}/${karaoke.totalCount}`);
}

// ============================================================================
// 运行测试
// ============================================================================

runTests();
