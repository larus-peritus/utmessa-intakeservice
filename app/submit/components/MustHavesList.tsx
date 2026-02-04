'use client';

interface MustHavesListProps {
  /** Array of must-have feature strings */
  items: string[];
  /** Handler for when items change */
  onChange: (items: string[]) => void;
  /** Error messages keyed by field path (e.g., "mustHaves.0") */
  errors: Record<string, string>;
}

/** Maximum number of must-have features allowed */
const MAX_ITEMS = 10;
/** Minimum number of must-have features required */
const MIN_ITEMS = 1;
/** Maximum length per feature */
const MAX_LENGTH = 100;

/**
 * Dynamic list component for must-have features
 *
 * Features:
 * - Renders list of input fields
 * - Add button to add new items (max 10)
 * - Remove button to delete items (min 1)
 * - Individual character limits per item
 * - ARIA labels for accessibility
 *
 * @example
 * ```tsx
 * <MustHavesList
 *   items={['Feature 1', 'Feature 2']}
 *   onChange={setMustHaves}
 *   errors={{ 'mustHaves.0': 'Required' }}
 * />
 * ```
 */
export default function MustHavesList({
  items,
  onChange,
  errors,
}: MustHavesListProps) {
  const addItem = () => {
    if (items.length < MAX_ITEMS) {
      onChange([...items, '']);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > MIN_ITEMS) {
      onChange(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nauðsynlegir eiginleikar{' '}
          <span className="text-red-500" aria-label="required">
            *
          </span>
        </label>
        <p className="text-sm text-slate-600 mb-3">
          Skráðu 1-10 lykileiginleika sem prufuútgáfan verður að hafa
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={`Eiginleiki ${index + 1}`}
                maxLength={MAX_LENGTH}
                className={`
                  w-full px-4 py-3 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-peritus-blue
                  transition-colors duration-200
                  ${errors[`mustHaves.${index}`] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}
                `}
                aria-label={`Nauðsynlegur eiginleiki ${index + 1}`}
                aria-invalid={!!errors[`mustHaves.${index}`]}
              />
              {errors[`mustHaves.${index}`] && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors[`mustHaves.${index}`]}
                </p>
              )}
            </div>

            {items.length > MIN_ITEMS && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 font-medium"
                aria-label={`Fjarlægja eiginleika ${index + 1}`}
              >
                Eyða
              </button>
            )}
          </div>
        ))}
      </div>

      {items.length < MAX_ITEMS && (
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 text-peritus-blue hover:bg-peritus-blue/10 rounded-lg transition-colors duration-200 border border-peritus-blue font-medium"
        >
          + Bæta við eiginleika
        </button>
      )}

      {/* General array-level error (e.g., "At least one feature required") */}
      {errors.mustHaves && (
        <p className="text-sm text-red-600" role="alert">
          {errors.mustHaves}
        </p>
      )}
    </div>
  );
}
