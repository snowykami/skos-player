export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
