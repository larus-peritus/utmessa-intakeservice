import type { IdeaStatus } from '@utmessa/shared';

interface StatusBadgeProps {
  status: IdeaStatus;
  className?: string;
}

/**
 * Status color and text configuration
 * Maps each status to its display text and Tailwind classes
 */
const STATUS_CONFIG: Record<
  IdeaStatus,
  { color: string; text: string }
> = {
  submitted: { color: 'bg-gray-100 text-gray-800', text: 'Innsend' },
  ready: { color: 'bg-blue-100 text-blue-800', text: 'Tilbúin' },
  claimed: { color: 'bg-yellow-100 text-yellow-800', text: 'Sótt' },
  running: { color: 'bg-blue-100 text-blue-800 animate-pulse', text: 'Í vinnslu' },
  waiting: { color: 'bg-orange-100 text-orange-800', text: 'Bíður svars' },
  deployed: { color: 'bg-green-100 text-green-800', text: 'Tilbúin' },
  failed: { color: 'bg-red-100 text-red-800', text: 'Mistókst' },
  abandoned: { color: 'bg-gray-100 text-gray-800', text: 'Hætt við' },
};

/**
 * StatusBadge - Displays the current status of an idea with appropriate color coding
 *
 * Features:
 * - Color-coded badges for each status
 * - Pulse animation for "running" status
 * - ARIA label for accessibility
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}
      role="status"
      aria-label={`Staða: ${config.text}`}
    >
      {config.text}
    </span>
  );
}
