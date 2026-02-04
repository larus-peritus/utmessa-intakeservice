import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import SubmitForm from './SubmitForm';

/**
 * Page metadata for SEO and social sharing
 */
export const metadata: Metadata = {
  title: 'Senda inn hugmynd | POC Gervigreindasmiður',
  description: 'Sendu inn hugmyndina þína og sjáðu hana verða að veruleika á UT messu 2026',
  openGraph: {
    title: 'Senda inn POC hugmynd',
    description: 'Sendu inn hugmyndina þína og sjáðu hana verða að veruleika',
    type: 'website',
  },
};

/**
 * Submit page - Main entry point for idea submission
 *
 * This is a server component that renders the page container.
 * The SubmitForm component is a client component that handles
 * form state and submission.
 *
 * Route: /submit
 */
export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <header className="text-center mb-8">
          {/* Logo */}
          <Link href="/" className="inline-block mb-6">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto">
              <Image
                src="/logo.png"
                alt="Peritus merki"
                fill
                className="object-contain"
              />
            </div>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Senda inn hugmynd
          </h1>
          <p className="text-slate-600 text-lg">
            Lýstu hugmyndinni þinni og við smíðum virka prufuútgáfu
          </p>
        </header>

        {/* Submission Form */}
        <SubmitForm />

        {/* Page Footer */}
        <footer className="mt-8 text-center text-sm text-slate-400">
          <p>Smíðað fyrir UT messu 2026</p>
          <p className="mt-2">
            Keyrt af{' '}
            <a
              href="https://peritus.is"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-peritus-blue hover:text-peritus-blue-dark transition-colors"
            >
              Peritus
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
