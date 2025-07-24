import React from 'react'
import Button from '../components/Button'

interface ReviewProps {
  selectedFiles: { [buttonNum: number]: string }
  selectedDicomFolder: string
  unityProjectPath: string
  status: string
  isExecuting: boolean
  onImport: () => Promise<void>
}

const Review: React.FC<ReviewProps> = ({
  selectedFiles,
  selectedDicomFolder,
  unityProjectPath,
  status,
  isExecuting,
  onImport
}) => {
  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-6">Review & Import</h2>

      {/* Summary */}
      <div className="w-full mb-6">
        <div className="bg-gray-900 rounded p-4 space-y-3">
          {Object.keys(selectedFiles).length > 0 && (
            <div>
              <h3 className="text-white text-sm font-medium mb-1">Selected Files:</h3>
              <div className="text-gray-300 text-xs">
                {Object.keys(selectedFiles).length} file(s) selected
              </div>
              <div className="mt-1 max-h-20 overflow-y-auto">
                {Object.entries(selectedFiles).map(([buttonNum, filePath]) => (
                  <div key={buttonNum} className="text-gray-400 text-xs break-all">
                    • Button {buttonNum}: {filePath.split('/').pop()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDicomFolder && (
            <div
              className={
                Object.keys(selectedFiles).length > 0 ? 'border-t border-gray-700 pt-3' : ''
              }
            >
              <h3 className="text-white text-sm font-medium mb-1">Selected DICOM Folder:</h3>
              <div className="text-gray-300 text-xs break-all">
                {selectedDicomFolder.split('/').pop()}
              </div>
              <div className="text-gray-400 text-xs break-all mt-1">{selectedDicomFolder}</div>
            </div>
          )}

          <div className="border-t border-gray-700 pt-3">
            <h3 className="text-white text-sm font-medium mb-1">Unity Project:</h3>
            <div className="text-gray-300 text-xs break-all">{unityProjectPath}</div>
          </div>
        </div>
      </div>

      {/* Import Button */}
      <div className="flex flex-col items-center mb-4">
        <Button
          variant="success"
          size="md"
          onClick={onImport}
          disabled={isExecuting}
          isLoading={isExecuting}
          className="w-64"
        >
          Import Files
        </Button>

        {/* Status Messages */}
        {status && <div className="mt-4 text-green-400 text-sm text-center max-w-64">{status}</div>}
      </div>
    </>
  )
}

export default Review
