import Link from 'next/link';
import FloatingQR from '@/components/FloatingQR';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <FloatingQR />
      {/* Mobile-first container */}
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-8 lg:px-12 lg:py-6 lg:min-h-0 lg:h-screen">
        <div className="w-full max-w-md lg:max-w-5xl mx-auto text-center">
          {/* Conference badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 lg:mb-[1.6875rem] rounded-full bg-peritus-blue/10 border border-peritus-blue/20 lg:px-5 lg:py-2.5">
            <span className="relative flex h-2 w-2 lg:h-2.5 lg:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peritus-orange opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 lg:h-2.5 lg:w-2.5 bg-peritus-orange"></span>
            </span>
            <span className="text-[1.2rem] lg:text-[1.575rem] font-semibold text-peritus-blue">
              Í beinni á UT messu 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[2.8rem] sm:text-[3.375rem] lg:text-[5.5rem] font-extrabold text-slate-900 mb-3 lg:mb-[1.8rem] tracking-tight leading-none">
            GERVIGREINDARSMIÐUR
          </h1>

          {/* Subheadline */}
          <p className="text-[1.575rem] sm:text-[1.75rem] lg:text-[2.625rem] text-slate-600 mb-8 lg:mb-8 leading-relaxed max-w-3xl mx-auto">
            Lýstu hugmyndinni þinni á{' '}
            <span className="text-peritus-blue font-semibold">utmessa.peritus.is</span>{' '}
            og sjáðu hvernig gervigreind smíðar prufuútgáfu af þinni hugmynd{' '}
            <span className="text-peritus-orange font-semibold">á nokkrum mínútum!</span>
          </p>

          {/* CTA Button */}
          <Link
            href="/submit"
            className="group inline-flex items-center justify-center w-full sm:w-auto px-10 py-5 sm:py-6 lg:px-12 lg:py-5 text-[1.575rem] sm:text-[1.75rem] lg:text-[1.75rem] font-bold text-white bg-gradient-to-r from-peritus-blue to-peritus-blue-dark hover:from-peritus-blue-dark hover:to-peritus-blue rounded-2xl shadow-lg shadow-peritus-blue/30 hover:shadow-xl hover:shadow-peritus-blue/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mb-8 lg:mb-6"
          >
            <span>Senda inn hugmynd</span>
            <svg
              className="ml-3 w-7 h-7 sm:w-8 sm:h-8 lg:w-8 lg:h-8 group-hover:translate-x-1 transition-transform"
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
          <div className="mt-8 lg:mt-6 pt-6 lg:pt-5 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-[1.225rem] lg:text-[1.4rem] text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Forritun framkvæmd af gervigreind</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Framvinda í rauntíma</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Virk prufuútgáfa</span>
              </div>
            </div>
          </div>

          {/* Powered by Peritus */}
          <div className="mt-5 lg:mt-4 text-[1.05rem] lg:text-[1.225rem] text-slate-400">
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
