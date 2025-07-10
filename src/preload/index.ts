import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types for better type safety
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

// Custom APIs for renderer
const api = {
  // File operations
  selectStlFile: (): Promise<string | null> => ipcRenderer.invoke('select-stl-file'),
  selectUnityProject: (): Promise<string | null> => ipcRenderer.invoke('select-unity-project'),
  copyStlToUnity: (stlFilePath: string, unityProjectPath: string): Promise<CopyResult> =>
    ipcRenderer.invoke('copy-stl-to-unity', stlFilePath, unityProjectPath),

  // Console logging
  onConsoleLog: (callback: (logData: ConsoleLogData) => void): void => {
    ipcRenderer.on('console-log', (_, logData) => callback(logData))
  },

  removeConsoleLogListeners: (): void => {
    ipcRenderer.removeAllListeners('console-log')
  }
}

// Expose APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // Fallback for when context isolation is disabled
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
