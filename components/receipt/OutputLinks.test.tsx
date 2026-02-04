import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutputLinks } from './OutputLinks';

describe('OutputLinks', () => {
  it('renders nothing when no URLs provided', () => {
    const { container } = render(
      <OutputLinks demoUrl={undefined} repoUrl={undefined} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders demo link when provided', () => {
    render(
      <OutputLinks
        demoUrl="https://demo.example.com"
        repoUrl={undefined}
      />
    );

    const demoLink = screen.getByRole('link', { name: /view demo/i });
    expect(demoLink).toHaveAttribute('href', 'https://demo.example.com');
    expect(demoLink).toHaveAttribute('target', '_blank');
    expect(demoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders repo link when provided', () => {
    render(
      <OutputLinks
        demoUrl={undefined}
        repoUrl="https://github.com/user/repo"
      />
    );

    const repoLink = screen.getByRole('link', { name: /view repository/i });
    expect(repoLink).toHaveAttribute('href', 'https://github.com/user/repo');
    expect(repoLink).toHaveAttribute('target', '_blank');
    expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders both links when both URLs provided', () => {
    render(
      <OutputLinks
        demoUrl="https://demo.example.com"
        repoUrl="https://github.com/user/repo"
      />
    );

    expect(screen.getByRole('link', { name: /view demo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view repository/i })).toBeInTheDocument();
  });

  it('displays success heading', () => {
    render(
      <OutputLinks
        demoUrl="https://demo.example.com"
        repoUrl={undefined}
      />
    );

    expect(screen.getByText('Your POC is Ready')).toBeInTheDocument();
  });

  it('truncates long URLs in display', () => {
    const longUrl =
      'https://demo.example.com/very/long/path/that/should/be/truncated/for/display';

    render(
      <OutputLinks demoUrl={longUrl} repoUrl={undefined} />
    );

    // The link still has the full URL
    const demoLink = screen.getByRole('link', { name: /view demo/i });
    expect(demoLink).toHaveAttribute('href', longUrl);
  });
});
