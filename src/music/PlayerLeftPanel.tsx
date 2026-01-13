import { Album } from './Album'

/**
 * 播放器左半部分 - 专辑封面展示区
 */
export default function PlayerLeftPanel() {
  return (
    <div className="shrink-0 w-full md:w-1/2 p-4 flex flex-col items-center justify-center">
      <Album />
    </div>
  )
}
