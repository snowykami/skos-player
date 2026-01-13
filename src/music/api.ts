import { snakeToCamelObj } from 'field-conv'
import type { MusicTrack } from './types'

// 复刻自 sfkm.me：歌单来自 CDN 的 json
export async function fetchPlaylist(): Promise<MusicTrack[]> {
  const response = await fetch('https://cdn.liteyuki.org/snowykami/music/playlists/favorite.json')
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  const raw = await response.json()
  return snakeToCamelObj(raw)
}

// 通过你的反代接口获取网易云歌词（避免浏览器侧 CORS）
export async function fetchNcmLyric(songId: number): Promise<string> {
  const resp = await fetch(`https://163lyricapi.072190.xyz/api/song/media?id=${encodeURIComponent(String(songId))}`)
  if (!resp.ok) {
    throw new Error('Failed to fetch lyrics')
  }

  const text = await resp.text()
  try {
    const json = JSON.parse(text)
    return json?.lyric ?? (json?.nolyric ? '[00:00.00]pure_music_without_lyric' : '[00:00.00]no_lyric')
  } catch (e) {
    console.error('Failed to parse lyrics JSON:', e)
    return '[00:00.00]no_lyric'
  }
}
