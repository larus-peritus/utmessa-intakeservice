import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getIdeaByToken } from '@/lib/db';
import type { IdeaStatus } from '@utmessa/shared';
import {
  StatusBadge,
  ProgressDisplay,
  WaitingAlert,
  OutputLinks,
  IdeaDetailsCard,
} from '@/components/receipt';

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Generate dynamic metadata for SEO and social sharing
 * Pages are marked noindex to prevent search engine indexing
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const idea = await getIdeaByToken(resolvedParams.token);

  if (!idea) {
    return {
      title: 'Kvittun fannst ekki | POC Gervigreindasmiður',
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: `${idea.title} - Kvittun | POC Gervigreindasmiður`,
    description: idea.problem.slice(0, 160),
    robots: 'noindex, nofollow',
    openGraph: {
      title: idea.title,
      description: idea.problem.slice(0, 160),
    },
  };
}

/**
 * Receipt page - View submitted idea and build progress
 *
 * This server component fetches idea data and renders the receipt page.
 * Shows:
 * - Current build status with color-coded badge
 * - Build progress with percentage and current step
 * - Idea details (title, problem, must-haves)
 * - Alert when waiting for user input
 * - Links to demo and repository when deployed
 *
 * Route: /i/[token]
 */
export default async function ReceiptPage({ params }: PageProps) {
  const resolvedParams = await params;
  const idea = await getIdeaByToken(resolvedParams.token);

  if (!idea) {
    notFound();
  }

  const createdDate = new Date(idea.createdAt).toLocaleDateString('is-IS', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-6 text-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-2">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto">
              <Image
                src="/logo.png"
                alt="Peritus merki"
                fill
                className="object-contain"
              />
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            POC Gervigreindasmiður
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Kvittun fyrir innsendu hugmyndina þína
          </p>
        </header>

        <main className="space-y-6">
          {/* Status and Progress Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-500">Staða</span>
              </div>
              <StatusBadge status={idea.status as IdeaStatus} />
            </div>

            <ProgressDisplay
              progress={idea.progress ?? undefined}
              currentStep={idea.currentStep ?? undefined}
              currentFeature={idea.currentFeature ?? undefined}
            />
          </div>

          {/* Waiting Alert */}
          {idea.status === 'waiting' && idea.waitingQuestion && (
            <WaitingAlert question={idea.waitingQuestion} />
          )}

          {/* Output Links (Demo & Repo) */}
          <OutputLinks
            demoUrl={idea.demoUrl ?? undefined}
            repoUrl={idea.repoUrl ?? undefined}
          />

          {/* Idea Details */}
          <IdeaDetailsCard
            title={idea.title}
            problem={idea.problem}
            mustHaves={idea.mustHaves}
          />

          {/* Metadata Footer */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p>Sent inn {createdDate}</p>
            <p className="text-xs text-gray-400 break-all">
              Kvittunar ID: {idea.token}
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Geymdu þennan hlekk til að fylgjast með framvindu.</p>
          <p className="mt-2">
            <a
              href="/submit"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Senda inn aðra hugmynd
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
