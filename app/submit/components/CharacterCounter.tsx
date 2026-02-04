'use client';

interface CharacterCounterProps {
  /** Current character count */
  current: number;
  /** Maximum allowed characters */
  max: number;
}

/**
 * Character counter component with color feedback
 *
 * Displays "current / max" format with color changes:
 * - Gray: Under 80% of limit
 * - Orange: 80-99% of limit (warning)
 * - Red: At 100% of limit (at limit, bold)
 *
 * @example
 * ```tsx
 * <CharacterCounter current={45} max={100} />
 * // Renders: "45 / 100" in gray
 *
 * <CharacterCounter current={85} max={100} />
 * // Renders: "85 / 100" in orange
 *
 * <CharacterCounter current={100} max={100} />
 * // Renders: "100 / 100" in red, bold
 * ```
 */
export default function CharacterCounter({ current, max }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80 && percentage < 100;
  const isAtLimit = current >= max;

  return (
    <div className="flex justify-end mt-1">
      <span
        className={`text-xs ${
          isAtLimit
            ? 'text-red-600 font-semibold'
            : isNearLimit
              ? 'text-orange-600'
              : 'text-slate-500'
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        {current} / {max}
      </span>
    </div>
  );
}
