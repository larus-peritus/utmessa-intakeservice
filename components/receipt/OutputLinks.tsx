interface OutputLinksProps {
  demoUrl: string | undefined;
  repoUrl: string | undefined;
}

/**
 * OutputLinks - Displays links to the deployed demo and repository
 *
 * Features:
 * - Prominent display of output URLs when available
 * - External link icons and security attributes
 * - Only renders when at least one URL is available
 */
export function OutputLinks({ demoUrl, repoUrl }: OutputLinksProps) {
  // Don't render if no URLs available
  if (!demoUrl && !repoUrl) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-green-800 flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Prufuútgáfan er tilbúin
      </h3>

      <div className="space-y-2">
        {demoUrl && (
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-lg border border-green-200 hover:bg-green-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              Opna demo
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {demoUrl}
            </span>
          </a>
        )}

        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-lg border border-green-200 hover:bg-green-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <svg
                className="w-4 h-4 text-gray-700"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Skoða kóða
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {repoUrl}
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
