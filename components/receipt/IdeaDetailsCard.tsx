interface IdeaDetailsCardProps {
  title: string;
  problem: string;
  mustHaves: string[];
}

/**
 * IdeaDetailsCard - Displays the submitted idea details (title, problem, must-haves)
 *
 * Features:
 * - Clean card layout for idea information
 * - Problem description with proper formatting
 * - Must-haves list with bullet points
 */
export function IdeaDetailsCard({ title, problem, mustHaves }: IdeaDetailsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Lýsing á vandamálinu</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{problem}</p>
      </div>

      {mustHaves.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Nauðsynlegir eiginleikar</h3>
          <ul className="space-y-1">
            {mustHaves.map((feature, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-gray-700"
              >
                <svg
                  className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
