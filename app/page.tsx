import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Mobile-first container */}
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-8 lg:px-12 lg:py-6 lg:min-h-0 lg:h-screen">
        <div className="w-full max-w-md lg:max-w-5xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-6 lg:mb-4 flex justify-center">
            <Logo size="medium" />
          </div>

          {/* Conference badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 lg:mb-[1.6875rem] rounded-full bg-peritus-blue/10 border border-peritus-blue/20 lg:px-5 lg:py-2">
            <span className="relative flex h-2 w-2 lg:h-2.5 lg:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peritus-orange opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 lg:h-2.5 lg:w-2.5 bg-peritus-orange"></span>
            </span>
            <span className="text-sm lg:text-lg font-semibold text-peritus-blue">
              Í beinni á UT messu 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-[3.625rem] font-extrabold text-slate-900 mb-3 lg:mb-[1.8rem] tracking-tight">
            POC Gervigreindasmiður
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl lg:text-[1.875rem] text-slate-600 mb-6 lg:mb-6 leading-relaxed max-w-2xl mx-auto">
            Lýstu hugmyndinni þinni og sjáðu hvernig gervigreind smíðar prufuútgáfu af þinni hugmynd{' '}
            <span className="text-peritus-orange font-semibold">á nokkrum mínútum!</span>
          </p>

          {/* CTA Button */}
          <Link
            href="/submit"
            className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 sm:py-5 lg:px-10 lg:py-4 text-lg sm:text-xl lg:text-xl font-bold text-white bg-gradient-to-r from-peritus-blue to-peritus-blue-dark hover:from-peritus-blue-dark hover:to-peritus-blue rounded-2xl shadow-lg shadow-peritus-blue/30 hover:shadow-xl hover:shadow-peritus-blue/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mb-6 lg:mb-4"
          >
            <span>Senda inn hugmynd</span>
            <svg
              className="ml-2 w-5 h-5 sm:w-6 sm:h-6 lg:w-6 lg:h-6 group-hover:translate-x-1 transition-transform"
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
          <div className="mt-6 lg:mt-4 pt-6 lg:pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-sm lg:text-base text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Forritun framkvæmd af gervigreind</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Framvinda í rauntíma</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Virk prufuútgáfa</span>
              </div>
            </div>
          </div>

          {/* Powered by Peritus */}
          <div className="mt-4 lg:mt-3 text-xs lg:text-sm text-slate-400">
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
