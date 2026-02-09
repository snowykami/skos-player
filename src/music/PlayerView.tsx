import { useState } from 'react'
import { useDevice } from '@/contexts/DeviceContext'
import { Album } from './Album'
import LyricScroller from './LyricScroller'
import PlayerLeftPanel from './PlayerLeftPanel'
import PlayerRightPanel, { PlayerTrackHeader } from './PlayerRightPanel'

type MobileCenterView = 'album' | 'lyric'

/**
 * 播放器主视图
 * - 桌面端：左右两栏
 * - 移动端：上中下三段式（信息 / 封面或歌词 / 控制器）
 */
export default function PlayerView() {
  const { isMobile } = useDevice()
  const [mobileCenterView, setMobileCenterView] = useState<MobileCenterView>('album')

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* 上：歌曲信息 */}
        <PlayerTrackHeader className="shrink-0 px-4 pt-4 pb-2" />

        {/* 中：封面/歌词（二选一） */}
        <div className="flex-1 min-h-0 flex flex-col px-4">
          {mobileCenterView === 'album'
            ? (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <Album onClick={() => setMobileCenterView('lyric')} />
                </div>
              )
            : (
                <div className="flex-1 min-h-0">
                  <LyricScroller variant="mobile" />
                </div>
              )}
        </div>

      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-row min-h-0" style={{ height: '90%' }}>
      <PlayerLeftPanel />
      <PlayerRightPanel />
    </div>
  )
}
