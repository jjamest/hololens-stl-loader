import React, { useState } from 'react'
import { Save, X } from 'lucide-react'
import Button from '../components/Button'

interface BuildSettingsProps {
  onClose?: () => void
  onSave?: (settings: BuildSettingsData) => void
}

interface BuildSettingsData {
  buildScript: string
  buildCommandParameters: string
}

const BuildSettings: React.FC<BuildSettingsProps> = ({ onClose, onSave }) => {
  const [buildScript, setBuildScript] = useState<string>('')
  const [buildCommandParameters, setBuildCommandParameters] = useState<string>('')

  const handleSave = (): void => {
    const settings: BuildSettingsData = {
      buildScript,
      buildCommandParameters
    }
    onSave?.(settings)
    onClose?.()
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

      <div className="space-y-4">
        {/* BuildScript.cs Section */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
          <h3 className="text-sm font-semibold text-white mb-2">BuildScript.cs</h3>
          <textarea
            value={buildScript}
            onChange={(e) => setBuildScript(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
            placeholder="using UnityEngine;
using UnityEditor;

public class BuildScript {
    public static void Build() {
        // Your build logic here
    }
}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Configure the C# build script for Unity project compilation.
          </p>
        </div>

        {/* Build Command Parameters Section */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
          <h3 className="text-sm font-semibold text-white mb-2">Build Command</h3>
          <textarea
            value={buildCommandParameters}
            onChange={(e) => setBuildCommandParameters(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
            placeholder="-buildTarget Win64 -buildPath ./Build/Windows
-configuration Release
-logFile build.log
-quit -batchmode -executeMethod BuildScript.Build"
          />
          <p className="text-xs text-gray-500 mt-1">
            Specify command line arguments and build parameters.
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
        >
          <X size={14} />
          <span>Cancel</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          className="flex items-center space-x-1"
        >
          <Save size={14} />
          <span>Save Settings</span>
        </Button>
      </div>
    </div>
  )
}

export default BuildSettings
