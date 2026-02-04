interface ProgressDisplayProps {
  progress: number | undefined;
  currentStep: string | undefined;
  currentFeature: string | undefined;
}

/**
 * ProgressDisplay - Shows build progress with a visual progress bar
 *
 * Features:
 * - Visual progress bar with percentage
 * - Current step description
 * - Current feature indicator
 * - ARIA attributes for accessibility
 */
export function ProgressDisplay({
  progress,
  currentStep,
  currentFeature,
}: ProgressDisplayProps) {
  // Don't render if no progress information
  if (progress === undefined && !currentStep && !currentFeature) {
    return null;
  }

  const progressPercent = progress ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Framvinda</span>
        <span className="font-medium text-gray-900">{progressPercent}%</span>
      </div>

      <div
        className="w-full bg-gray-200 rounded-full h-2.5"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Framvinda: ${progressPercent}%`}
      >
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {(currentStep || currentFeature) && (
        <div className="text-sm text-gray-600">
          {currentStep && (
            <p className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              {currentStep}
            </p>
          )}
          {currentFeature && (
            <p className="mt-1 text-xs text-gray-500">
              Eiginleiki: {currentFeature}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
