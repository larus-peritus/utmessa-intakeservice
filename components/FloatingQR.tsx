'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function FloatingQR() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Set initial position once on mount
  useEffect(() => {
    if (!initialized.current) {
      setPosition({
        x: window.innerWidth - 260,
        y: window.innerHeight - 420,
      });
      initialized.current = true;
    }
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const onMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={cardRef}
      className="hidden lg:block fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div className="w-[230px] rounded-xl shadow-2xl overflow-hidden bg-white border border-slate-200">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-peritus-blue to-peritus-blue-dark px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          </div>
          <span className="text-white text-sm font-semibold tracking-wide">
            QR Kóði
          </span>
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={() => {}}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.4-5.4M20 15a9 9 0 01-15.4 5.4" />
              </svg>
            </button>
            {/* Minimize */}
            <button
              onClick={() => setMinimized((m) => !m)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label={minimized ? 'Expand' : 'Minimize'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {!minimized && (
          <>
            <div className="p-5 flex flex-col items-center">
              <QRCodeSVG
                value="https://utmessa.peritus.is"
                size={170}
                level="M"
                marginSize={0}
              />
              <p className="mt-3 text-sm font-medium text-slate-600">
                utmessa.peritus.is
              </p>
            </div>

            {/* Drag handle */}
            <div
              onMouseDown={onMouseDown}
              className="border-t border-slate-100 py-1.5 text-center cursor-grab active:cursor-grabbing select-none"
            >
              <span className="text-xs text-slate-400">
                Dragðu til að færa
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
