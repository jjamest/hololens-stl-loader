import React from 'react'
import Button from '../components/Button'

interface SelectModelsProps {
  selectedFiles: { [buttonNum: number]: string }
  selectedDicomFolder: string
  onSelectModelForButton: (buttonNum: number) => Promise<void>
  onClearModelForButton: (buttonNum: number) => void
  onSelectDicomFolder: () => Promise<void>
  onClearDicomFolder: () => void
  onNext: () => void
}

const SelectModels: React.FC<SelectModelsProps> = ({
  selectedFiles,
  selectedDicomFolder,
  onSelectModelForButton,
  onClearModelForButton,
  onSelectDicomFolder,
  onClearDicomFolder,
  onNext
}) => {
  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-6">Select 3D Models</h2>

      {/* STL Model Selection */}
      <div className="flex flex-col items-center mb-8 w-full">
        {[1, 2, 3, 4].map((buttonNum) => (
          <div key={buttonNum} className="flex items-center justify-between w-80 mb-4">
            <span className="text-white text-sm">Button {buttonNum}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSelectModelForButton(buttonNum)}
                className="px-4 py-2 w-28"
              >
                {selectedFiles[buttonNum] ? 'Change' : 'Choose'}
              </Button>
              <div className="w-20 pl-4">
                {selectedFiles[buttonNum] && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onClearModelForButton(buttonNum)}
                    className="px-3 py-1.5 w-full"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show selected files */}
      {Object.keys(selectedFiles).length > 0 && (
        <div className="mb-6 w-full flex flex-col items-center">
          <div className="text-center">
            {Object.entries(selectedFiles).map(([buttonNum, filePath]) => (
              <div key={buttonNum} className="text-gray-300 text-xs mb-1 break-all">
                Button {buttonNum}: {filePath.split('/').pop()}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-white text-xl font-semibold mb-6">Select DICOM Models (CT Scan)</h2>

      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="secondary" size="md" onClick={onSelectDicomFolder} className="w-64">
            Select Folder
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onClearDicomFolder}
            disabled={!selectedDicomFolder}
            className="px-3 py-2"
          >
            Clear
          </Button>
        </div>
        <span className="text-gray-400 text-sm mt-5">
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
        disabled={Object.keys(selectedFiles).length === 0 && !selectedDicomFolder}
        className="w-64"
      >
        Next: Review & Import
      </Button>
    </>
  )
}

export default SelectModels
