import type { DeviceContextProps } from '@/contexts/DeviceContext'
import { Moon, Sun } from 'lucide-react'

type Mode = DeviceContextProps['mode']

interface Props {
  mode: Mode
  toggleMode: () => void
  progressColor: string
}

export default function ThemeModeButtons({ mode, toggleMode, progressColor }: Props) {
  return (
    <button
      type="button"
      onClick={toggleMode}
      className="w-9 h-9 text-xs rounded-full transition-all duration-200 flex items-center justify-center shadow-sm"
      style={{ backgroundColor: progressColor, color: '#fff' }}
      title={mode === 'system' ? '主题：自动' : mode === 'light' ? '主题：白天' : '主题：暗黑'}
    >
      {mode === 'system'
        ? (
            <span className="font-bold leading-none select-none">A</span>
          )
        : mode === 'light'
          ? (
              <Sun className="w-4 h-4" />
            )
          : (
              <Moon className="w-4 h-4" />
            )}
    </button>
  )
}
