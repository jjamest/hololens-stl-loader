import React from 'react'
import Button from '../components/Button'

interface SelectProjectProps {
  unityProjectPath: string
  onSelectProject: () => Promise<void>
  onNext: () => void
  onBack: () => void
}

const SelectProject: React.FC<SelectProjectProps> = ({
  unityProjectPath,
  onSelectProject,
  onNext,
  onBack
}) => {
  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-6">Select Unity Project</h2>

      {/* Unity Project Selection */}
      <div className="flex flex-col items-center mb-8">
        <Button variant="secondary" size="md" onClick={onSelectProject} className="w-64 mb-2">
          Select Unity Project
        </Button>
        <span className="text-gray-400 text-sm">
          {unityProjectPath || 'No Unity project selected'}
        </span>
      </div>

      {/* Show selected project path */}
      {unityProjectPath && (
        <div className="mb-6 w-full">
          <h3 className="text-white text-sm font-medium mb-2">Selected Project:</h3>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-gray-300 text-xs break-all">{unityProjectPath}</div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 w-full">
        <Button variant="secondary" size="md" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!unityProjectPath}
          className="flex-1"
        >
          Next: Review
        </Button>
      </div>
    </>
  )
}

export default SelectProject
