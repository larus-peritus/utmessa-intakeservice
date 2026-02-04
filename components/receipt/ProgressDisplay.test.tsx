import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDisplay } from './ProgressDisplay';

describe('ProgressDisplay', () => {
  it('renders nothing when all props are undefined', () => {
    const { container } = render(
      <ProgressDisplay
        progress={undefined}
        currentStep={undefined}
        currentFeature={undefined}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders progress bar with correct percentage', () => {
    render(
      <ProgressDisplay
        progress={50}
        currentStep={undefined}
        currentFeature={undefined}
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders 0% progress correctly', () => {
    render(
      <ProgressDisplay
        progress={0}
        currentStep={undefined}
        currentFeature={undefined}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders 100% progress correctly', () => {
    render(
      <ProgressDisplay
        progress={100}
        currentStep={undefined}
        currentFeature={undefined}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('displays current step when provided', () => {
    render(
      <ProgressDisplay
        progress={30}
        currentStep="Building authentication module"
        currentFeature={undefined}
      />
    );

    expect(screen.getByText('Building authentication module')).toBeInTheDocument();
  });

  it('displays current feature when provided', () => {
    render(
      <ProgressDisplay
        progress={30}
        currentStep={undefined}
        currentFeature="F2"
      />
    );

    expect(screen.getByText('Feature: F2')).toBeInTheDocument();
  });

  it('displays both current step and feature when provided', () => {
    render(
      <ProgressDisplay
        progress={60}
        currentStep="Implementing user dashboard"
        currentFeature="F3"
      />
    );

    expect(screen.getByText('Implementing user dashboard')).toBeInTheDocument();
    expect(screen.getByText('Feature: F3')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ProgressDisplay
        progress={75}
        currentStep={undefined}
        currentFeature={undefined}
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-label', 'Build progress: 75%');
  });

  it('renders when only currentStep is provided', () => {
    render(
      <ProgressDisplay
        progress={undefined}
        currentStep="Starting build"
        currentFeature={undefined}
      />
    );

    expect(screen.getByText('Starting build')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
