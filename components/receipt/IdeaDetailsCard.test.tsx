import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdeaDetailsCard } from './IdeaDetailsCard';

describe('IdeaDetailsCard', () => {
  it('displays the idea title', () => {
    render(
      <IdeaDetailsCard
        title="Recipe Tracker App"
        problem="Need to track family recipes"
        mustHaves={[]}
      />
    );

    expect(screen.getByText('Recipe Tracker App')).toBeInTheDocument();
  });

  it('displays the problem statement', () => {
    render(
      <IdeaDetailsCard
        title="Test"
        problem="This is the problem statement that describes what the user wants to solve."
        mustHaves={[]}
      />
    );

    expect(
      screen.getByText(
        'This is the problem statement that describes what the user wants to solve.'
      )
    ).toBeInTheDocument();
  });

  it('displays must-have features', () => {
    render(
      <IdeaDetailsCard
        title="Test"
        problem="Problem"
        mustHaves={['Authentication', 'Search feature', 'Dark mode']}
      />
    );

    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Search feature')).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('hides must-haves section when array is empty', () => {
    render(
      <IdeaDetailsCard title="Test" problem="Problem" mustHaves={[]} />
    );

    expect(screen.queryByText('Must-Have Features')).not.toBeInTheDocument();
  });

  it('shows must-haves heading when features exist', () => {
    render(
      <IdeaDetailsCard title="Test" problem="Problem" mustHaves={['Feature 1']} />
    );

    expect(screen.getByText('Must-Have Features')).toBeInTheDocument();
  });

  it('displays problem statement heading', () => {
    render(
      <IdeaDetailsCard title="Test" problem="Problem" mustHaves={[]} />
    );

    expect(screen.getByText('Problem Statement')).toBeInTheDocument();
  });

  it('applies whitespace-pre-wrap class to problem text', () => {
    render(
      <IdeaDetailsCard
        title="Test"
        problem="Multi-line problem"
        mustHaves={[]}
      />
    );

    const problemElement = screen.getByText('Multi-line problem');
    expect(problemElement).toHaveClass('whitespace-pre-wrap');
  });

  it('handles many must-have items', () => {
    const manyFeatures = Array.from({ length: 10 }, (_, i) => `Feature ${i + 1}`);

    render(
      <IdeaDetailsCard title="Test" problem="Problem" mustHaves={manyFeatures} />
    );

    manyFeatures.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });
});
