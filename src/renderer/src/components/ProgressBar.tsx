import React from 'react'

interface ProgressBarProps {
  currentStep: number
  steps: string[]
  onStepClick?: (step: number) => void
  completedSteps?: number[]
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  steps,
  onStepClick,
  completedSteps = []
}) => {
  const isStepClickable = (index: number): boolean => {
    // Allow clicking on:
    // 1. Build & Deploy tab (index 3) - always accessible
    // 2. Current/previous steps in sequence
    // 3. Any completed step
    // 4. If currently on Build & Deploy tab (currentStep 3), only allow clicking on completed steps or step 0
    if (currentStep === 3 && index !== 3) {
      // Allow clicking on any completed step or step 0
      return index === 0 || completedSteps.includes(index)
    }
    return index === 3 || index <= currentStep || completedSteps.includes(index)
  }
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-start justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index)
          const isCurrent = index === currentStep
          const clickable = isStepClickable(index)

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center relative z-10">
                {/* Step circle */}
                <button
                  onClick={() => clickable && onStepClick?.(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    isCompleted
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : isCurrent
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : clickable
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          : 'bg-gray-700 text-gray-500'
                  } ${clickable && onStepClick ? 'cursor-pointer' : 'cursor-default'}`}
                  disabled={!onStepClick || !clickable}
                >
                  {isCompleted ? '✓' : index + 1}
                </button>

                {/* Step label */}
                <span
                  className={`mt-3 text-xs font-medium text-center max-w-20 ${
                    isCompleted
                      ? 'text-green-400'
                      : isCurrent
                        ? 'text-blue-400'
                        : clickable
                          ? 'text-gray-500'
                          : 'text-gray-600'
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
