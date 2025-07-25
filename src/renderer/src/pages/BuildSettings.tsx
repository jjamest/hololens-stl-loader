import React, { useState, useEffect } from 'react'
import { Save, X, RefreshCw } from 'lucide-react'
import Button from '../components/Button'

interface BuildSettingsProps {
  onClose?: () => void
  onSave?: (settings: BuildSettingsData) => void
  unityProjectPath?: string
}

interface BuildSettingsData {
  buildScript: string
  buildCommandParameters: string
}

const BuildSettings: React.FC<BuildSettingsProps> = ({ onClose, onSave, unityProjectPath }) => {
  const [buildScript, setBuildScript] = useState<string>('')
  const [buildCommandParameters, setBuildCommandParameters] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    setIsLoading(true)
    setMessage(null)

    try {
      const result = await window.api.loadBuildSettings()

      if (result.success && result.settings) {
        setBuildScript(result.settings.buildScript)
        setBuildCommandParameters(result.settings.buildCommandParameters)
        setMessage({ type: 'info', text: 'Settings loaded successfully' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to load settings' })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    setMessage(null)

    try {
      const settings: BuildSettingsData = {
        buildScript,
        buildCommandParameters
      }

      // Save settings to persistent storage
      const saveResult = await window.api.saveBuildSettings(settings)

      if (!saveResult.success) {
        setMessage({ type: 'error', text: saveResult.error || 'Failed to save settings' })
        return
      }

      // Update build script in Unity project if path is provided
      if (unityProjectPath && buildScript.trim()) {
        const updateResult = await window.api.updateBuildScript(unityProjectPath, buildScript)

        if (!updateResult.success) {
          setMessage({
            type: 'error',
            text: updateResult.error || 'Failed to update build script in Unity project'
          })
          return
        }
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' })

      // Call parent callback
      onSave?.(settings)

      // Close modal immediately after successful save
      onClose?.()
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = (): void => {
    onClose?.()
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">Build Settings</h2>
        <p className="text-gray-400 text-xs">Configure build script and command parameters</p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-600/30'
              : message.type === 'error'
                ? 'bg-red-900/50 text-red-300 border border-red-600/30'
                : 'bg-blue-900/50 text-blue-300 border border-blue-600/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* BuildScript.cs Section */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">BuildScript.cs</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadSettings}
              disabled={isLoading}
              className="flex items-center space-x-1 text-xs"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Reload</span>
            </Button>
          </div>
          <textarea
            value={buildScript}
            onChange={(e) => setBuildScript(e.target.value)}
            className="w-full h-40 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
            placeholder="using UnityEngine;
using UnityEditor;

public class BuildScript {
    public static void Build() {
        // Your build logic here
    }
}"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Configure the C# build script for Unity project compilation. This will be saved to
            Assets/Editor/BuildScript.cs
          </p>
        </div>

        {/* Build Command Parameters Section */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
          <h3 className="text-sm font-semibold text-white mb-2">Build Command Parameters</h3>
          <textarea
            value={buildCommandParameters}
            onChange={(e) => setBuildCommandParameters(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
            placeholder='-batchmode -quit -projectPath "PROJECT_PATH" -executeMethod BuildScript.BuildUWP -logFile "PROJECT_PATH/build.log"'
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Unity command line arguments. Use{' '}
            <code className="bg-gray-700 px-1 rounded">PROJECT_PATH</code> as placeholder for the
            Unity project path.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-3 pt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          className="flex items-center space-x-1"
          disabled={isSaving}
        >
          <X size={14} />
          <span>Cancel</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-1"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </Button>
      </div>
    </div>
  )
}

export default BuildSettings
