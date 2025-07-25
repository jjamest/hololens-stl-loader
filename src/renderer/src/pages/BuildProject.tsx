import React, { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import Button from '../components/Button'
import BuildSettings from './BuildSettings'

interface BuildProjectProps {
  unityProjectPath: string
}

const BuildProject: React.FC<BuildProjectProps> = ({ unityProjectPath }) => {
  const [buildScriptExists, setBuildScriptExists] = useState<boolean>(false)
  const [isCheckingBuildScript, setIsCheckingBuildScript] = useState<boolean>(false)
  const [isBuildingUnity, setIsBuildingUnity] = useState<boolean>(false)
  const [buildOutput, setBuildOutput] = useState<string>('')
  const [buildError, setBuildError] = useState<string>('')
  const [showBuildSettings, setShowBuildSettings] = useState<boolean>(false)

  // Check if build script exists when component mounts or unity project path changes
  useEffect(() => {
    const checkBuildScript = async (): Promise<void> => {
      if (!unityProjectPath) {
        setBuildScriptExists(false)
        return
      }

      setIsCheckingBuildScript(true)
      try {
        const result = await window.api.checkBuildScript(unityProjectPath)
        setBuildScriptExists(result.exists)
        if (result.error) {
          console.error('Error checking build script:', result.error)
        }
      } catch (error) {
        console.error('Failed to check build script:', error)
        setBuildScriptExists(false)
      } finally {
        setIsCheckingBuildScript(false)
      }
    }

    checkBuildScript()
  }, [unityProjectPath])

  const handleAttachBuildScript = async (): Promise<void> => {
    if (!unityProjectPath) {
      console.error('No Unity project path available')
      return
    }

    try {
      const result = await window.api.attachBuildScript(unityProjectPath)

      if (result.success) {
        console.log('Build script attached successfully:', result.message)
        // Refresh the build script status
        const checkResult = await window.api.checkBuildScript(unityProjectPath)
        setBuildScriptExists(checkResult.exists)
      } else {
        console.error('Failed to attach build script:', result.error)
      }
    } catch (error) {
      console.error('Error attaching build script:', error)
    }
  }

  const handleBuildUnity = async (): Promise<void> => {
    if (!unityProjectPath) {
      console.error('No Unity project path available')
      setBuildError('No Unity project path available')
      return
    }

    if (!buildScriptExists) {
      console.error('Build script not attached')
      setBuildError('Build script not attached. Please attach the build script first.')
      return
    }

    setIsBuildingUnity(true)
    setBuildOutput('')
    setBuildError('')

    try {
      console.log('Starting Unity build...')
      const result = await window.api.buildUnity(unityProjectPath)

      if (result.success) {
        console.log('Unity build completed successfully:', result)
        setBuildOutput(
          `Build completed successfully!\nBuild path: ${result.buildPath}\n\n${result.log || ''}`
        )
        setBuildError('')
      } else {
        console.error('Unity build failed:', result.error)
        setBuildError(result.error || 'Unity build failed')
        setBuildOutput(result.log || result.stdout || '')
      }
    } catch (error) {
      console.error('Error during Unity build:', error)
      setBuildError(error instanceof Error ? error.message : 'Unknown error during build')
      setBuildOutput('')
    } finally {
      setIsBuildingUnity(false)
    }
  }

  const handleCleanBuildFolder = async (): Promise<void> => {
    if (!unityProjectPath) {
      console.error('No Unity project path available')
      setBuildError('No Unity project path available')
      return
    }

    try {
      console.log('Cleaning build folder...')
      const result = await window.api.cleanBuildFolder(unityProjectPath)

      if (result.success) {
        console.log('Build folder cleaned successfully:', result.message)
        setBuildOutput(`Build folder cleaned\n${result.message}`)
        setBuildError('')
      } else {
        console.error('Failed to clean build folder:', result.error)
        setBuildError(result.error || 'Failed to clean build folder')
        setBuildOutput('')
      }
    } catch (error) {
      console.error('Error cleaning build folder:', error)
      setBuildError(
        error instanceof Error ? error.message : 'Unknown error while cleaning build folder'
      )
      setBuildOutput('')
    }
  }

  const handleBuildVisualStudio = (): void => {
    // TODO: Implement build Visual Studio functionality
    console.log('Build Visual Studio clicked')
  }

  const handleDeployToDevice = (): void => {
    // TODO: Implement deploy to device functionality
    console.log('Deploy to Device clicked')
  }

  const handleShowBuildSettings = (): void => {
    setShowBuildSettings(true)
  }

  const handleCloseBuildSettings = (): void => {
    setShowBuildSettings(false)
  }

  const handleSaveBuildSettings = (settings: {
    buildScript: string
    buildCommandParameters: string
  }): void => {
    console.log('Build settings saved:', settings)
    // TODO: Implement saving build settings to storage or state
  }

  return (
    <>
      {showBuildSettings ? (
        <BuildSettings
          onClose={handleCloseBuildSettings}
          onSave={handleSaveBuildSettings}
          unityProjectPath={unityProjectPath}
        />
      ) : (
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Build & Deploy</h2>
            <p className="text-gray-400 text-sm">Build your project and deploy to device</p>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>Unity Project: {unityProjectPath ? 'Selected' : 'None'}</div>
              <div className="flex items-center justify-center space-x-2">
                <span>Build Script:</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    buildScriptExists
                      ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                      : 'bg-red-900/30 text-red-400 border border-red-500/30'
                  }`}
                >
                  {isCheckingBuildScript
                    ? 'Checking...'
                    : buildScriptExists
                      ? 'Ready'
                      : 'Not Attached'}
                </span>
              </div>
            </div>
          </div>

          {unityProjectPath ? (
            <div className="flex flex-col space-y-4 items-center">
              <Button
                variant="primary"
                size="md"
                onClick={handleAttachBuildScript}
                className="w-64 mb-4"
                disabled={isCheckingBuildScript}
              >
                {isCheckingBuildScript
                  ? 'Checking...'
                  : buildScriptExists
                    ? 'Reset Build Script'
                    : 'Attach Build Script'}
              </Button>

              <div className="relative flex justify-center mb-4">
                <div className="flex space-x-4 w-64">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleCleanBuildFolder}
                    className="flex-1 text-xs"
                  >
                    Clean Build Folder
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleBuildUnity}
                    className="flex-1 text-xs"
                    disabled={!buildScriptExists || isBuildingUnity}
                  >
                    {isBuildingUnity ? 'Building Unity...' : 'Build Unity'}
                  </Button>
                </div>

                <button
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 w-6 h-6 hover:bg-gray-600 border-gray-600 rounded-md transition-colors duration-200 flex items-center justify-center"
                  onClick={handleShowBuildSettings}
                  title="Unity Build Settings"
                >
                  <Settings size={15} className="text-gray-300" />
                </button>
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={handleBuildVisualStudio}
                className="w-64 mb-4"
              >
                Build Visual Studio
              </Button>

              <Button
                variant="success"
                size="md"
                onClick={handleDeployToDevice}
                className="w-64 mb-4"
              >
                Deploy to Device
              </Button>

              {/* Build Output Display */}
              {(buildOutput || buildError) && (
                <div className="w-full max-w-2xl mt-6">
                  {buildError && (
                    <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <h3 className="text-red-400 font-semibold mb-2">Build Error:</h3>
                      <pre className="text-red-300 text-sm whitespace-pre-wrap overflow-x-auto">
                        {buildError}
                      </pre>
                    </div>
                  )}

                  {buildOutput && (
                    <div className="p-4 bg-gray-900/50 border border-gray-600/30 rounded-lg">
                      <h3 className="text-green-400 font-semibold mb-2">Build Output:</h3>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                        {buildOutput}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p>No Unity project was selected</p>
              <p className="text-sm text-gray-500 mt-2">
                Please go back and select a Unity project first
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default BuildProject
