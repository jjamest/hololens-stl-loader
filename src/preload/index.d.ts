import { ElectronAPI } from '@electron-toolkit/preload'

// Type definitions matching the preload API
interface ConsoleLogData {
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: string
  source: 'main' | 'renderer'
}

interface CopyResult {
  success: boolean
  destinationPath?: string
  message?: string
  error?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // File operations
      selectStlFile: () => Promise<string | null>
      selectUnityProject: () => Promise<string | null>
      copyStlToUnity: (stlFilePath: string, unityProjectPath: string) => Promise<CopyResult>

      // Console logging
      onConsoleLog: (callback: (logData: ConsoleLogData) => void) => void
      removeConsoleLogListeners: () => void
    }
  }
}
