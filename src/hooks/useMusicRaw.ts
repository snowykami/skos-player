/**
 * useMusicRaw - 仅用于辅助初始化（避免在 localStorage 未加载前渲染整个 App 导致状态抖动）
 */
import { useContext } from 'react'
import { MusicContext, type MusicContextValue } from '@/contexts/MusicContext'

export function useMusicRaw(): MusicContextValue | null {
  return useContext(MusicContext)
}
