import { PulseMark } from '@/components/layout/pulse-mark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[hsl(240,10%,6%)] lg:flex lg:flex-col lg:justify-between lg:p-10">
        <PulseGrid />
        <div className="relative z-10 flex items-center gap-2 text-white">
          <PulseMark className="h-6 w-6" />
          <span className="font-mono text-sm tracking-wide">pulse</span>
        </div>
        <div className="relative z-10 max-w-md text-white">
          <p className="text-2xl font-medium leading-snug">
            Every job, tracked from queued to completed — claimed atomically, retried on your terms,
            never lost.
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-white/40">
            Distributed Job Queue &amp; Worker Orchestration
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

/**
 * Signature element: a faint grid of "pulse" dots, one per job slot, that
 * animate on staggered delays — a still-frame metaphor for concurrent
 * workers claiming and completing jobs across the grid.
 */
function PulseGrid() {
  const dots = Array.from({ length: 96 });
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-12 gap-6 p-10 opacity-40">
      {dots.map((_, i) => (
        <span
          key={i}
          className="h-1 w-1 animate-pulse-dot rounded-full bg-primary"
          style={{ animationDelay: `${(i % 12) * 0.15}s` }}
        />
      ))}
    </div>
  );
}
