import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types for better type safety
interface ConsoleLogData {
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: string
  source: 'main' | 'renderer'
}

// Custom APIs for renderer
const api = {
  // File operations
  selectModelFiles: (): Promise<string[] | null> => ipcRenderer.invoke('select-model-files'),
  selectUnityProject: (): Promise<string | null> => ipcRenderer.invoke('select-unity-project'),
  selectDICOMFolder: (): Promise<string | null> => ipcRenderer.invoke('select-dicom-folder'),

  // Build script operations
  checkBuildScript: (
    unityProjectPath: string
  ): Promise<{ exists: boolean; path: string | null; error?: string }> =>
    ipcRenderer.invoke('check-build-script', unityProjectPath),

  attachBuildScript: (
    unityProjectPath: string
  ): Promise<{ success: boolean; path?: string; message?: string; error?: string }> =>
    ipcRenderer.invoke('attach-build-script', unityProjectPath),

  // Import operation
  importToUnity: (
    selectedFiles: { [buttonNum: number]: string } | string[],
    selectedDicomFolder: string,
    unityProjectPath: string
  ): Promise<{ success: boolean; destinationPath?: string; message?: string; error?: string }[]> =>
    ipcRenderer.invoke('import-to-unity', selectedFiles, selectedDicomFolder, unityProjectPath),

  // Build operation
  buildUnity: (
    unityProjectPath: string
  ): Promise<{
    success: boolean
    buildPath?: string
    message?: string
    error?: string
    log?: string
    stdout?: string
    stderr?: string
  }> => ipcRenderer.invoke('build-unity', unityProjectPath),
  cleanBuildFolder: (
    unityProjectPath: string
  ): Promise<{
    success: boolean
    message?: string
    error?: string
    deletedPath?: string
  }> => ipcRenderer.invoke('clean-build-folder', unityProjectPath),

  // Build settings management
  saveBuildSettings: (settings: {
    buildScript: string
    buildCommandParameters: string
  }): Promise<{
    success: boolean
    message?: string
    path?: string
    error?: string
  }> => ipcRenderer.invoke('save-build-settings', settings),

  loadBuildSettings: (): Promise<{
    success: boolean
    settings?: {
      buildScript: string
      buildCommandParameters: string
    }
    error?: string
  }> => ipcRenderer.invoke('load-build-settings'),

  updateBuildScript: (
    unityProjectPath: string,
    buildScriptContent: string
  ): Promise<{
    success: boolean
    path?: string
    message?: string
    error?: string
  }> => ipcRenderer.invoke('update-build-script', unityProjectPath, buildScriptContent),

  buildUnityWithSettings: (
    unityProjectPath: string,
    buildCommand: string
  ): Promise<{
    success: boolean
    message?: string
    error?: string
    log?: string
    stdout?: string
    stderr?: string
  }> => ipcRenderer.invoke('build-unity-with-settings', unityProjectPath, buildCommand),

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
