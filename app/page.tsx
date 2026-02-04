import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Mobile-first container */}
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-md mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              <Image
                src="/logo.png"
                alt="Peritus merki"
                fill
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>

          {/* Conference badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-peritus-blue/10 border border-peritus-blue/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peritus-orange opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-peritus-orange"></span>
            </span>
            <span className="text-sm font-semibold text-peritus-blue">
              Í beinni á UT messu 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            POC Gervigreindasmiður
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
            Lýstu hugmyndinni þinni og sjáðu hvernig gervigreind smíðar prufuútgáfu af þinni hugmynd{' '}
            <span className="text-peritus-orange font-semibold">á nokkrum mínútum!</span>
          </p>

          {/* CTA Button - Large touch target for mobile */}
          <Link
            href="/submit"
            className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 sm:py-5 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-peritus-blue to-peritus-blue-dark hover:from-peritus-blue-dark hover:to-peritus-blue rounded-2xl shadow-lg shadow-peritus-blue/30 hover:shadow-xl hover:shadow-peritus-blue/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <span>Senda inn hugmynd</span>
            <svg
              className="ml-2 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>

          {/* Trust indicators */}
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Forritun framkvæmd af gervigreind</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Framvinda í rauntíma</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Virk prufuútgáfa</span>
              </div>
            </div>
          </div>

          {/* Powered by Peritus */}
          <div className="mt-8 text-sm text-slate-400">
            Keyrt af{' '}
            <a
              href="https://peritus.is"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-peritus-blue hover:text-peritus-blue-dark transition-colors"
            >
              Peritus
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
