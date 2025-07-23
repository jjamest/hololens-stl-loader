import React from 'react'
import Button from '../components/Button'

interface ReviewProps {
  selectedFiles: string[]
  selectedDicomFolder: string
  unityProjectPath: string
  status: string
  isExecuting: boolean
  onImport: () => Promise<void>
  onBack: () => void
}

const Review: React.FC<ReviewProps> = ({
  selectedFiles,
  selectedDicomFolder,
  unityProjectPath,
  status,
  isExecuting,
  onImport,
  onBack
}) => {
  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-6">Review & Import</h2>

      {/* Summary */}
      <div className="w-full mb-6">
        <div className="bg-gray-900 rounded p-4 space-y-3">
          {selectedFiles.length > 0 && (
            <div>
              <h3 className="text-white text-sm font-medium mb-1">Selected Files:</h3>
              <div className="text-gray-300 text-xs">{selectedFiles.length} file(s) selected</div>
              <div className="mt-1 max-h-20 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="text-gray-400 text-xs break-all">
                    • {file.split('/').pop()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDicomFolder && (
            <div className={selectedFiles.length > 0 ? 'border-t border-gray-700 pt-3' : ''}>
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

      {/* Back Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onBack}
        disabled={isExecuting}
        className="w-64"
      >
        Back to Project Selection
      </Button>
    </>
  )
}

export default Review
