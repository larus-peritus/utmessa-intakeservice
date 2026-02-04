interface WaitingAlertProps {
  question: string;
}

/**
 * WaitingAlert - Displays a prominent alert when the build is waiting for user input
 *
 * Features:
 * - Orange/yellow warning styling to draw attention
 * - Shows the question that needs user response
 * - Clear call-to-action messaging
 */
export function WaitingAlert({ question }: WaitingAlertProps) {
  return (
    <div
      className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-orange-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-orange-800">
            Svar þarf
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p>{question}</p>
          </div>
          <p className="mt-3 text-xs text-orange-600">
            Vinsamlegast svaraðu til að halda áfram.
          </p>
        </div>
      </div>
    </div>
  );
}
