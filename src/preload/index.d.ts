import { ElectronAPI } from '@electron-toolkit/preload'

// Type definitions matching the preload API
interface ConsoleLogData {
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: string
  source: 'main' | 'renderer'
}

export interface IElectronAPI {
  selectModelFiles: () => Promise<string[] | null>
  selectUnityProject: () => Promise<string | null>
  selectDICOMFolder: () => Promise<string | null>
  importToUnity: (
    selectedFiles: { [buttonNum: number]: string } | string[],
    selectedDicomFolder: string,
    unityProjectPath: string
  ) => Promise<CopyResult[]>
  buildUnity: (unityProjectPath: string) => Promise<BuildResult>
  cleanBuildFolder: (unityProjectPath: string) => Promise<void>
}

export interface CopyResult {
  success: boolean
  destinationPath?: string
  message?: string
  error?: string
}

export interface BuildResult {
  success: boolean
  buildPath?: string
  message?: string
  error?: string
  log?: string
  stdout?: string
  stderr?: string
}

export interface CleanBuildResult {
  success: boolean
  message?: string
  error?: string
  deletedPath?: string
}

export interface BuildSettingsData {
  buildScript: string
  buildCommandParameters: string
}

export interface BuildSettingsResult {
  success: boolean
  message?: string
  path?: string
  error?: string
}

export interface LoadBuildSettingsResult {
  success: boolean
  settings?: BuildSettingsData
  error?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // File operations
      selectModelFiles: () => Promise<string[] | null>
      selectUnityProject: () => Promise<string | null>
      selectDICOMFolder: () => Promise<string | null>

      // Build script operations
      checkBuildScript: (
        unityProjectPath: string
      ) => Promise<{ exists: boolean; path: string | null; error?: string }>

      attachBuildScript: (
        unityProjectPath: string
      ) => Promise<{ success: boolean; path?: string; message?: string; error?: string }>

      // Import operation
      importToUnity: (
        selectedFiles: { [buttonNum: number]: string } | string[],
        selectedDicomFolder: string,
        unityProjectPath: string
      ) => Promise<CopyResult[]>

      // Build operation
      buildUnity: (unityProjectPath: string) => Promise<BuildResult>
      cleanBuildFolder: (unityProjectPath: string) => Promise<CleanBuildResult>

      // Build settings management
      saveBuildSettings: (settings: BuildSettingsData) => Promise<BuildSettingsResult>
      loadBuildSettings: () => Promise<LoadBuildSettingsResult>
      updateBuildScript: (
        unityProjectPath: string,
        buildScriptContent: string
      ) => Promise<BuildSettingsResult>
      buildUnityWithSettings: (
        unityProjectPath: string,
        buildCommand: string
      ) => Promise<BuildResult>

      // Console logging
      onConsoleLog: (callback: (logData: ConsoleLogData) => void) => void
      removeConsoleLogListeners: () => void
    }
  }
}
