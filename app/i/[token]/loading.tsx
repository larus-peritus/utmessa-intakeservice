/**
 * Loading state for receipt page
 *
 * Shows a skeleton UI while the page data is being fetched.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header skeleton */}
        <header className="mb-8 text-center">
          <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
        </header>

        <main className="space-y-6">
          {/* Status card skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="h-2.5 w-full bg-gray-200 rounded-full animate-pulse" />
          </div>

          {/* Idea details skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
        </main>
      </div>
    </div>
  );
}
