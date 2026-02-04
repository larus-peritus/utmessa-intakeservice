import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaitingAlert } from './WaitingAlert';

describe('WaitingAlert', () => {
  it('displays the question text', () => {
    render(<WaitingAlert question="Which authentication method do you prefer?" />);

    expect(
      screen.getByText('Which authentication method do you prefer?')
    ).toBeInTheDocument();
  });

  it('has an alert role', () => {
    render(<WaitingAlert question="Test question" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live polite attribute', () => {
    render(<WaitingAlert question="Test question" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('displays Input Required heading', () => {
    render(<WaitingAlert question="Test question" />);

    expect(screen.getByText('Input Required')).toBeInTheDocument();
  });

  it('displays help text', () => {
    render(<WaitingAlert question="Test question" />);

    expect(
      screen.getByText('Please respond to continue the build process.')
    ).toBeInTheDocument();
  });

  it('renders with long question text', () => {
    const longQuestion =
      'This is a very long question that might appear when the system needs detailed user input about complex architectural decisions that could affect the entire application structure?';

    render(<WaitingAlert question={longQuestion} />);

    expect(screen.getByText(longQuestion)).toBeInTheDocument();
  });
});
