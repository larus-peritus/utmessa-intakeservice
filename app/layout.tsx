import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UT messa POC Builder',
  description: 'Submit your POC idea and watch it get built in real-time',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
