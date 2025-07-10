import { useState, useEffect, useRef } from 'react'

interface ConsoleLog {
  id: number
  timestamp: string
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  source: 'main' | 'renderer'
}

function App(): React.JSX.Element {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedUnityProjectPath, setSelectedUnityProjectPath] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  // Setup console logging
  useEffect(() => {
    // Listen for console messages from main process
    if (window.api?.onConsoleLog) {
      window.api.onConsoleLog((logData) => {
        const newLog: ConsoleLog = {
          id: logIdRef.current++,
          timestamp: new Date(logData.timestamp).toLocaleTimeString(),
          level: logData.level,
          message: logData.message,
          source: logData.source
        }
        setConsoleLogs((prev) => [...prev, newLog])
      })
    }

    // Cleanup function
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

  const handleSelectFile = async (): Promise<void> => {
    try {
      if (!window.api?.selectStlFile) {
        addConsoleLog('error', 'API not available')
        return
      }
      const filePath = await window.api.selectStlFile()
      addConsoleLog('log', `Selected file path: ${filePath}`)
      setSelectedFilePath(filePath)
      clearMessages()
    } catch (error) {
      addConsoleLog('error', `Error selecting file: ${error}`)
    }
  }

  const handleSelectUnityProject = async (): Promise<void> => {
    try {
      const filePath = await window.api.selectUnityProject()
      addConsoleLog('log', `Selected Unity project path: ${filePath}`)
      setSelectedUnityProjectPath(filePath)
      clearMessages()
    } catch (error) {
      addConsoleLog('error', `Error selecting Unity project: ${error}`)
    }
  }

  const handleExecute = async (): Promise<void> => {
    // Validation
    if (!selectedFilePath || !selectedUnityProjectPath) {
      const missingItems: string[] = []
      if (!selectedFilePath) missingItems.push('STL model')
      if (!selectedUnityProjectPath) missingItems.push('Unity project')

      const errorMsg = `Please select ${missingItems.join(' and ')} before executing.`
      setErrorMessage(errorMsg)
      addConsoleLog('error', errorMsg)
      return
    }

    clearMessages()
    setIsExecuting(true)

    try {
      addConsoleLog(
        'log',
        `Starting execution... STL: ${selectedFilePath}, Unity: ${selectedUnityProjectPath}`
      )

      const result = await window.api.copyStlToUnity(selectedFilePath, selectedUnityProjectPath)

      if (result.success) {
        setSuccessMessage(result.message || 'STL file successfully imported into Unity project!')
        addConsoleLog('log', `File copied to: ${result.destinationPath}`)
      } else {
        setErrorMessage(result.error || 'Failed to import STL file into Unity project.')
        addConsoleLog('error', `Copy failed: ${result.error}`)
      }
    } catch (error) {
      addConsoleLog('error', `Error during execution: ${error}`)
      setErrorMessage('An unexpected error occurred while importing the STL file.')
    } finally {
      setIsExecuting(false)
      addConsoleLog('log', 'Execution completed')
    }
  }

  const getDisplayText = (path: string | null, fallback: string): string => {
    return path || fallback
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
                onClick={handleSelectFile}
              >
                Select STL Model
              </button>
              <span className="text-gray-400 text-sm">
                {getDisplayText(selectedFilePath, 'No model selected')}
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
                {getDisplayText(selectedUnityProjectPath, 'No Unity project selected')}
              </span>
            </div>

            {/* Execute Button */}
            <div className="flex flex-col items-center">
              <button
                className="w-80 text-center bg-black hover:bg-gray-900 text-white py-4 px-8 rounded text-lg font-medium transition-colors border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? 'Importing...' : 'Execute'}
              </button>

              {/* Status Messages */}
              {errorMessage && (
                <div className="mt-4 text-red-400 text-sm text-center max-w-80">{errorMessage}</div>
              )}
              {successMessage && (
                <div className="mt-4 text-green-400 text-sm text-center max-w-80">
                  {successMessage}
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
