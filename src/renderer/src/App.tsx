import { useState, useEffect, useRef } from 'react'
import SelectModels from './pages/SelectModels'
import SelectProject from './pages/SelectProject'
import Review from './pages/Review'
import ProgressBar from './components/ProgressBar'
import Button from './components/Button'

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
      selectDICOMFolder: () => Promise<string | null>
      importToUnity: (
        selectedFiles: string[],
        selectedDicomFolder: string,
        unityProjectPath: string
      ) => Promise<
        { success: boolean; destinationPath?: string; message?: string; error?: string }[]
      >
      onConsoleLog?: (callback: (data: ConsoleLogData) => void) => void
      removeConsoleLogListeners?: () => void
    }
  }
}

function App(): React.JSX.Element {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedDicomFolder, setSelectedDicomFolder] = useState<string>('')
  const [unityProjectPath, setUnityProjectPath] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const [currentStep, setCurrentStep] = useState<number>(0)
  const consoleEndRef = useRef<HTMLDivElement>(null)
  const logIdRef = useRef(0)

  const steps = ['Select Models', 'Select Project', 'Review & Import']

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

    const handler = (logData: ConsoleLogData): void => {
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

  // Step navigation functions
  const goToNextStep = (): void => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
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

  const handleSelectDicomFolder = async (): Promise<void> => {
    try {
      if (!window.api?.selectDICOMFolder) {
        throw new Error('DICOM folder selection API not available')
      }
      const folderPath = await window.api.selectDICOMFolder()
      if (folderPath) {
        addConsoleLog('log', `Selected DICOM folder: ${folderPath}`)
        setSelectedDicomFolder(folderPath)
        clearMessages()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addConsoleLog('error', `Error selecting DICOM folder: ${errorMessage}`)
    }
  }

  const handleImport = async (): Promise<void> => {
    if (!window.api?.importToUnity) {
      addConsoleLog('error', 'Import API not available')
      return
    }

    if (!selectedFiles.length && !selectedDicomFolder) {
      const errorMsg = 'Please select files or DICOM folder before importing.'
      setStatus(errorMsg)
      addConsoleLog('error', errorMsg)
      return
    }

    if (!unityProjectPath) {
      const errorMsg = 'Please select Unity project directory before importing.'
      setStatus(errorMsg)
      addConsoleLog('error', errorMsg)
      return
    }

    clearMessages()
    setIsExecuting(true)

    try {
      addConsoleLog(
        'log',
        `Starting import of ${selectedFiles.length} files and ${selectedDicomFolder ? '1 DICOM folder' : 'no DICOM folders'}...`
      )

      const results = await window.api.importToUnity(
        selectedFiles,
        selectedDicomFolder,
        unityProjectPath
      )
      const successCount = results.filter((r) => r.success).length

      setStatus(`Imported ${successCount} of ${results.length} items successfully`)
      addConsoleLog(
        'log',
        `Import completed: ${successCount} successful, ${results.length - successCount} failed`
      )

      results.forEach((result) => {
        if (result.success) {
          addConsoleLog(
            'info',
            result.message || `Successfully imported: ${result.destinationPath}`
          )
        } else {
          addConsoleLog('error', result.error || 'Failed to import item')
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

  // Render current step component
  const renderCurrentStep = (): React.JSX.Element => {
    switch (currentStep) {
      case 0:
        return (
          <SelectModels
            selectedFiles={selectedFiles}
            selectedDicomFolder={selectedDicomFolder}
            onSelectFiles={handleSelectStl}
            onSelectDicomFolder={handleSelectDicomFolder}
            onNext={goToNextStep}
          />
        )
      case 1:
        return (
          <SelectProject
            unityProjectPath={unityProjectPath}
            onSelectProject={handleSelectUnityProject}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )
      case 2:
        return (
          <Review
            selectedFiles={selectedFiles}
            selectedDicomFolder={selectedDicomFolder}
            unityProjectPath={unityProjectPath}
            status={status}
            isExecuting={isExecuting}
            onImport={handleImport}
            onBack={goToPreviousStep}
          />
        )
      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <div className="h-screen flex gap-4 p-4 overflow-hidden">
      {/* Left side - Current step component with progress bar */}
      <div className="flex-shrink-0 flex items-center justify-center w-1/2">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-lg w-full border border-gray-700">
          {/* Progress Bar */}
          <div className="mb-8">
            <ProgressBar currentStep={currentStep} steps={steps} />
          </div>

          {/* Current Step Content */}
          <div className="flex flex-col items-center">{renderCurrentStep()}</div>
        </div>
      </div>

      {/* Right side - Console */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 h-80 w-full flex flex-col">
          {/* Console header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <div>
              <h3 className="text-white font-medium">Console</h3>
              <div className="text-xs text-gray-500 mt-1">
                [M] Main Process • [R] Renderer Process
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearConsole}>
              Clear
            </Button>
          </div>

          {/* Console content */}
          <div className="flex-1 pl-2 pr-6 py-4 overflow-y-auto font-mono text-sm min-h-0">
            {consoleLogs.length === 0 ? (
              <div className="text-gray-500 pl-2 italic">No console output yet...</div>
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
