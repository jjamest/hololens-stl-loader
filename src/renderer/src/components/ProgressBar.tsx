import React from 'react'

interface ProgressBarProps {
  currentStep: number
  steps: string[]
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-start justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center relative z-10">
                {/* Step circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Step label */}
                <span
                  className={`mt-3 text-xs font-medium text-center max-w-20 ${
                    isCompleted ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="flex-1 flex items-center px-2 relative top-5">
                  <div className={`w-full h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}`} />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressBar
