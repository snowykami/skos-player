/**
 * useMusic hook - 从 MusicContext 获取播放状态
 */
import { useContext } from 'react'
import { MusicContext, type MusicContextValue } from '@/contexts/MusicContext'
export { MusicContext }

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext)
  if (!ctx)
    throw new Error('useMusic must be used within MusicProvider')
  return ctx
}
