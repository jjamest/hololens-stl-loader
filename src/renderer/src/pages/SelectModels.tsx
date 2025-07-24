import React from 'react'
import Button from '../components/Button'

interface SelectModelsProps {
  selectedFiles: string[]
  selectedDicomFolder: string
  onSelectFiles: () => Promise<void>
  onSelectDicomFolder: () => Promise<void>
  onNext: () => void
}

const SelectModels: React.FC<SelectModelsProps> = ({
  selectedFiles,
  selectedDicomFolder,
  onSelectFiles,
  onSelectDicomFolder,
  onNext
}) => {
  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-6">Select 3D Models</h2>

      {/* STL Model Selection */}
      <div className="flex flex-col items-center mb-8">
        <Button variant="secondary" size="md" onClick={onSelectFiles} className="w-64 mb-2">
          Select Files
        </Button>
        <span className="text-gray-400 text-sm">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} files selected`
            : 'No files selected'}
        </span>
      </div>

      {/* Show selected files */}
      {selectedFiles.length > 0 && (
        <div className="mb-6 w-full flex flex-col items-center">
          <div className="text-center">
            {selectedFiles.map((file, index) => (
              <div key={index} className="text-gray-300 text-xs mb-1 break-all">
                {file.split('/').pop()}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-white text-xl font-semibold mb-6">Select DICOM Models (CT Scan)</h2>

      <div className="flex flex-col items-center mb-8">
        <Button variant="secondary" size="md" onClick={onSelectDicomFolder} className="w-64 mb-2">
          Select Folder
        </Button>
        <span className="text-gray-400 text-sm">
          {selectedDicomFolder
            ? `Folder selected: ${selectedDicomFolder.split('/').pop()}`
            : 'No folder selected'}
        </span>
      </div>

      {/* Show selected DICOM folder path */}
      {selectedDicomFolder && (
        <div className="mb-6 w-full flex flex-col items-center">
          <div className="text-center">
            <div className="text-gray-300 text-xs mb-1 break-all">{selectedDicomFolder}</div>
          </div>
        </div>
      )}

      {/* Next Button */}
      <Button
        variant="primary"
        size="md"
        onClick={onNext}
        disabled={selectedFiles.length === 0 && !selectedDicomFolder}
        className="w-64"
      >
        Next: Review & Import
      </Button>
    </>
  )
}

export default SelectModels
