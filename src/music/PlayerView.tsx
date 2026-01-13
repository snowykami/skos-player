import PlayerLeftPanel from './PlayerLeftPanel'
import PlayerRightPanel from './PlayerRightPanel'

/**
 * 播放器主视图
 * 包含左半部分（专辑封面）和右半部分（歌曲信息与歌词）
 */
export default function PlayerView() {
  return (
    <div className="flex-1 flex flex-row min-h-0" style={{ height: '90%' }}>
      <PlayerLeftPanel />
      <PlayerRightPanel />
    </div>
  )
}
