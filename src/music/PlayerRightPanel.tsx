import { Disc, User } from 'lucide-react'
import { useMusic } from '@/hooks/useMusic'
import LyricScroller from './LyricScroller'

export type PlayerTrackHeaderProps = {
  className?: string
}

export function PlayerTrackHeader({ className }: PlayerTrackHeaderProps) {
  const { currentTrack } = useMusic()

  return (
    <div className={className}>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2 w-full min-w-0">
        <div className="truncate">
          {currentTrack?.name || '未播放'}
          <span className="text-gray-600 dark:text-gray-400/80">
            {currentTrack?.aliases?.length ? ` (${currentTrack?.aliases?.join(', ')})` : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300 overflow-hidden">
        <span className="flex items-center gap-1 min-w-0 overflow-hidden text-ellipsis">
          <Disc className="w-4 h-4 shrink-0" />
          <span className="truncate">{currentTrack?.album || '--'}</span>
        </span>

        <span className="flex items-center gap-1 min-w-0 overflow-hidden text-ellipsis">
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">{currentTrack?.artists?.join(', ') || '--'}</span>
        </span>

        <span
          className="flex items-center gap-1 min-w-0 overflow-hidden text-ellipsis cursor-pointer"
          onClick={() => {
            if (currentTrack?.link)
              window.open(currentTrack.link, '_blank')
          }}
        />
      </div>
    </div>
  )
}

/**
 * 播放器右半部分 - 歌曲信息与歌词显示区
 */
export default function PlayerRightPanel() {
  return (
    <div className="flex-1 p-6 flex flex-col min-h-0 max-w-full overflow-hidden">
      {/* 歌曲信息头部 */}
      <PlayerTrackHeader className="mb-4 max-w-full" />

      {/* 歌词滚动区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-2 mb-4 overflow-x-hidden w-full">
        <LyricScroller />
      </div>
    </div>
  )
}
