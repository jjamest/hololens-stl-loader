import { useState, useEffect, useRef } from 'react'

interface CopyResult {
  success: boolean
  destinationPath?: string
  message?: string
  error?: string
}

interface ConsoleLogData {
  timestamp: number
  level: ConsoleLog['level']
  message: string
  source: ConsoleLog['source']
}

interface ConsoleLog {
  id: number
  timestamp: string
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  source: 'main' | 'renderer'
}

declare global {
  interface Window {
    api: {
      selectStlFile: () => Promise<string[]>
      selectUnityProject: () => Promise<string | null>
      copyStlToUnity: (stlFiles: string[], unityPath: string) => Promise<CopyResult[]>
      onConsoleLog?: (callback: (data: ConsoleLogData) => void) => void
      removeConsoleLogListeners?: () => void
      convertStlToObj: (stlFilePath: string) => Promise<string>
    }
  }
}

function App(): React.JSX.Element {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [unityProjectPath, setUnityProjectPath] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const consoleEndRef = useRef<HTMLDivElement>(null)
  const logIdRef = useRef(0)

  // Add console log helper
  const addConsoleLog = (
    level: ConsoleLog['level'],
    message: string,
    source: ConsoleLog['source'] = 'renderer'
  ): void => {
    const newLog: ConsoleLog = {
      id: logIdRef.current++,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source
    }
    setConsoleLogs((prev) => [...prev, newLog])
  }

  // Clear any existing messages helper
  const clearMessages = (): void => {
    setStatus('')
  }

  // Setup console logging
  useEffect(() => {
    if (!window.api?.onConsoleLog) {
      console.warn('Console logging API not available')
      return
    }

    const handler = (logData: ConsoleLogData) => {
      const newLog: ConsoleLog = {
        id: logIdRef.current++,
        timestamp: new Date(logData.timestamp).toLocaleTimeString(),
        level: logData.level,
        message: logData.message,
        source: logData.source
      }
      setConsoleLogs((prev) => [...prev, newLog])
    }

    window.api.onConsoleLog(handler)

    return () => {
      window.api?.removeConsoleLogListeners?.()
    }
  }, [])

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consoleLogs])

  const clearConsole = (): void => {
    setConsoleLogs([])
    addConsoleLog('info', 'Console cleared')
  }

  const handleSelectStl = async (): Promise<void> => {
    try {
      if (!window.api?.selectStlFile) {
        throw new Error('File selection API not available')
      }
      const files = await window.api.selectStlFile()
      if (files?.length) {
        addConsoleLog('log', `Selected files: ${files.join(', ')}`)
        setSelectedFiles(files)
        clearMessages()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addConsoleLog('error', `Error selecting files: ${errorMessage}`)
    }
  }

  const handleSelectUnityProject = async (): Promise<void> => {
    try {
      if (!window.api?.selectUnityProject) {
        throw new Error('Unity project selection API not available')
      }
      const projectPath = await window.api.selectUnityProject()
      if (projectPath) {
        addConsoleLog('log', `Selected Unity project path: ${projectPath}`)
        setUnityProjectPath(projectPath)
        clearMessages()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addConsoleLog('error', `Error selecting Unity project: ${errorMessage}`)
    }
  }

  const handleImport = async (): Promise<void> => {
    if (!window.api?.copyStlToUnity || !window.api?.convertStlToObj) {
      addConsoleLog('error', 'Import or conversion API not available')
      return
    }

    if (!selectedFiles.length || !unityProjectPath) {
      const missingItems: string[] = []
      if (!selectedFiles.length) missingItems.push('STL files')
      if (!unityProjectPath) missingItems.push('Unity project directory')

      const errorMsg = `Please select ${missingItems.join(' and ')} before importing.`
      setStatus(errorMsg)
      addConsoleLog('error', errorMsg)
      return
    }

    clearMessages()
    setIsExecuting(true)

    try {
      const processedFiles: string[] = []

      // Process each file
      for (const filePath of selectedFiles) {
        const fileExtension = filePath.toLowerCase().split('.').pop()
        
        if (fileExtension === 'stl') {
          addConsoleLog('info', `Converting STL file: ${filePath}`)
          try {
            const objFilePath = await window.api.convertStlToObj(filePath)
            processedFiles.push(objFilePath)
            addConsoleLog('info', `Successfully converted to OBJ: ${objFilePath}`)
          } catch (convError) {
            addConsoleLog('error', `Failed to convert STL file: ${filePath}`)
            continue
          }
        } else if (fileExtension === 'obj') {
          processedFiles.push(filePath)
        } else {
          addConsoleLog('warn', `Skipping unsupported file: ${filePath}`)
          continue
        }
      }

      if (processedFiles.length === 0) {
        throw new Error('No valid files to import')
      }

      addConsoleLog('log', `Starting import of ${processedFiles.length} files...`)
      const results = await window.api.copyStlToUnity(processedFiles, unityProjectPath)
      const successCount = results.filter((r) => r.success).length

      setStatus(`Imported ${successCount} of ${results.length} files successfully`)
      addConsoleLog('log', `Import completed: ${successCount} successful, ${results.length - successCount} failed`)

      results.forEach((result) => {
        if (result.success) {
          addConsoleLog('info', `Successfully imported: ${result.destinationPath}`)
        } else {
          addConsoleLog('error', `Failed to import: ${result.error}`)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addConsoleLog('error', `Error during import: ${errorMessage}`)
      setStatus('An unexpected error occurred while importing the files.')
    } finally {
      setIsExecuting(false)
      addConsoleLog('log', 'Import process finished')
    }
  }   
  const getLogLevelColor = (level: ConsoleLog['level']): string => {
    const colors = {
      error: 'text-red-400',
      warn: 'text-yellow-400',
      info: 'text-blue-400',
      log: 'text-gray-300'
    }
    return colors[level]
  }

  const getSourceBadge = (source: ConsoleLog['source']): string => {
    return source === 'main' ? 'M' : 'R'
  }

  const getSourceColor = (source: ConsoleLog['source']): string => {
    return source === 'main' ? 'text-green-400' : 'text-blue-400'
  }

  return (
    <div className="min-h-screen flex gap-8 p-8">
      {/* Left side - Main controls */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg shadow-lg p-12 max-w-2xl w-full border border-gray-700">
          <div className="actions flex flex-col items-center">
            {/* STL Model Selection */}
            <div className="flex flex-col items-center mb-12">
              <button
                className="w-80 text-center bg-black hover:bg-gray-900 text-white py-4 px-8 rounded text-lg font-medium transition-colors border border-gray-600 mb-2"
                onClick={handleSelectStl}
              >
                Select STL Files
              </button>
              <span className="text-gray-400 text-sm">
                {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 'No files selected'}
              </span>
            </div>

            {/* Unity Project Selection */}
            <div className="flex flex-col items-center mb-12">
              <button
                className="w-80 text-center bg-black hover:bg-gray-900 text-white py-4 px-8 rounded text-lg font-medium transition-colors border border-gray-600 mb-2"
                onClick={handleSelectUnityProject}
              >
                Select Unity Project
              </button>
              <span className="text-gray-400 text-sm">
                {unityProjectPath || 'No Unity project selected'}
              </span>
            </div>

            {/* Execute Button */}
            <div className="flex flex-col items-center">
              <button
                className="w-80 text-center bg-black hover:bg-gray-900 text-white py-4 px-8 rounded text-lg font-medium transition-colors border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleImport}
                disabled={isExecuting}
              >
                {isExecuting ? 'Importing...' : 'Import Files'}
              </button>

              {/* Status Messages */}
              {status && (
                <div className="mt-4 text-green-400 text-sm text-center max-w-80">
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Console */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
          {/* Console header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-medium">Console</h3>
            <button
              onClick={clearConsole}
              className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded border border-gray-600 hover:border-gray-500 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Console content */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
            {consoleLogs.length === 0 ? (
              <div className="text-gray-500 italic">No console output yet...</div>
            ) : (
              consoleLogs.map((log) => (
                <div key={log.id} className="mb-1 flex items-start">
                  <div className="flex-shrink-0 flex items-start">
                    <span className="text-gray-500 mr-2 w-28 text-right">[{log.timestamp}]</span>
                    <span className={`${getSourceColor(log.source)} mr-3 w-4 text-center`}>
                      [{getSourceBadge(log.source)}]
                    </span>
                  </div>
                  <span className={`${getLogLevelColor(log.level)} flex-1 break-words`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
