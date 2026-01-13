/**
 * 歌词 API 封装
 */

import type { RawLyricResponse } from '@/lyric/types';

const LYRIC_API_BASE = 'https://ncm-api.sfkm.me/lyric';

/**
 * 歌词 API 响应格式
 */
export interface LyricApiResponse {
  sgc: boolean;
  sfy: boolean;
  qfy: boolean;
  transUser: {
    id: number;
    status: number;
    demand: number;
    userid: number;
    nickname: string;
    uptime: number;
  };
  lyricUser: {
    id: number;
    status: number;
    demand: number;
    userid: number;
    nickname: string;
    uptime: number;
  };
  lrc: {
    version: number;
    lyric: string;
  } | null;
  klyric: {
    version: number;
    lyric: string;
  } | null;
  tlyric: {
    version: number;
    lyric: string;
  } | null;
  romalrc: {
    version: number;
    lyric: string;
  } | null;
  yrc: {
    version: number;
    lyric: string;
  } | null;
  ytlrc: {
    version: number;
    lyric: string;
  } | null;
  yromalrc: {
    version: number;
    lyric: string;
  } | null;
  code: number;
}

/**
 * 获取歌词
 * @param songId 歌曲 ID
 * @returns 歌词 API 响应
 */
export async function fetchLyric(songId: number | string): Promise<LyricApiResponse> {
  const response = await fetch(`${LYRIC_API_BASE}/new?id=${songId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch lyric: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 将 API 响应转换为 RawLyricResponse 格式
 * @param apiResponse API 响应
 * @returns 解析器需要的格式
 */
export function convertToRawLyricResponse(apiResponse: LyricApiResponse): RawLyricResponse {
  return {
    lrc: apiResponse.lrc ?? undefined,
    tlyric: apiResponse.tlyric ?? undefined,
    romalrc: apiResponse.romalrc ?? undefined,
    yrc: apiResponse.yrc ?? undefined,
    ytlrc: apiResponse.ytlrc ?? undefined,
    yromalrc: apiResponse.yromalrc ?? undefined,
  };
}

/**
 * 获取并解析歌词（返回解析后的结果）
 * @param songId 歌曲 ID
 * @returns 解析后的歌词数据
 */
export async function fetchAndParseLyric(songId: number | string) {
  const apiResponse = await fetchLyric(songId);
  const rawLyric = convertToRawLyricResponse(apiResponse);
  return rawLyric;
}
