import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import type { IdeaStatus } from '@utmessa/shared';

describe('StatusBadge', () => {
  const statusTests: Array<{ status: IdeaStatus; expectedText: string; expectedColor: string }> = [
    { status: 'submitted', expectedText: 'Submitted', expectedColor: 'bg-gray-100' },
    { status: 'ready', expectedText: 'Ready', expectedColor: 'bg-blue-100' },
    { status: 'claimed', expectedText: 'Claimed', expectedColor: 'bg-yellow-100' },
    { status: 'running', expectedText: 'Building', expectedColor: 'bg-blue-100' },
    { status: 'waiting', expectedText: 'Waiting for Input', expectedColor: 'bg-orange-100' },
    { status: 'deployed', expectedText: 'Deployed', expectedColor: 'bg-green-100' },
    { status: 'failed', expectedText: 'Failed', expectedColor: 'bg-red-100' },
    { status: 'abandoned', expectedText: 'Abandoned', expectedColor: 'bg-gray-100' },
  ];

  it.each(statusTests)(
    'renders correct text and color for $status status',
    ({ status, expectedText, expectedColor }) => {
      render(<StatusBadge status={status} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent(expectedText);
      expect(badge.className).toContain(expectedColor);
    }
  );

  it('applies pulse animation for running status', () => {
    render(<StatusBadge status="running" />);

    const badge = screen.getByRole('status');
    expect(badge.className).toContain('animate-pulse');
  });

  it('does not apply pulse animation for other statuses', () => {
    render(<StatusBadge status="submitted" />);

    const badge = screen.getByRole('status');
    expect(badge.className).not.toContain('animate-pulse');
  });

  it('includes ARIA label', () => {
    render(<StatusBadge status="deployed" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Current status: Deployed');
  });

  it('accepts custom className', () => {
    render(<StatusBadge status="submitted" className="custom-class" />);

    const badge = screen.getByRole('status');
    expect(badge.className).toContain('custom-class');
  });
});
