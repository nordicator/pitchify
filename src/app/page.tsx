import SharkSceneLoader from "@/components/shark-scene-loader";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <span className="text-lg font-semibold tracking-tight">pitchify</span>
        <a
          href="#"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Start pitching
        </a>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 pb-24 pt-16 md:pt-24">
        {/* Hero: text + shark side by side */}
        <div className="flex w-full max-w-5xl flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
          {/* Left: copy */}
          <div className="flex-1 text-center md:text-left">
            <p className="mb-6 font-mono text-sm uppercase tracking-widest text-muted">
              The tank is waiting
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Five sharks.
              <br />
              One pitch.
              <br />
              No mercy.
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted">
              Step into the tank and pitch your product to AI sharks — each with
              a real investing personality. They&apos;ll grill you on valuation,
              market size, and why they should care.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row md:justify-start">
              <a
                href="#"
                className="rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90"
              >
                Enter the tank
              </a>
              <a
                href="#"
                className="rounded-full border border-border px-8 py-3.5 text-base font-medium text-muted transition-colors hover:border-muted hover:text-foreground"
              >
                Watch a demo
              </a>
            </div>
          </div>

          {/* Right: 3D shark */}
          <div className="flex-1 w-full max-w-md">
            <SharkSceneLoader />
          </div>
        </div>

        {/* Sharks panel */}
        <div className="mt-32 w-full max-w-5xl">
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted">
            The panel
          </p>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
            {[
              { name: "Mr. Wonderful", style: "Ruthless on royalties" },
              { name: "The Operator", style: "Wants proof you can execute" },
              { name: "The Visionary", style: "Bets on big markets" },
              { name: "The Skeptic", style: "Pokes every assumption" },
              { name: "The Closer", style: "Negotiates hard and fast" },
            ].map((shark) => (
              <div key={shark.name} className="bg-surface px-4 py-5">
                <p className="text-sm font-medium">{shark.name}</p>
                <p className="mt-1 text-xs text-muted">{shark.style}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="border-t border-border px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-12 font-mono text-xs uppercase tracking-widest text-muted">
            How it works
          </p>
          <div className="space-y-10">
            <div className="flex gap-6">
              <span className="font-mono text-sm text-muted">01</span>
              <div>
                <h3 className="text-base font-semibold">Set your ask</h3>
                <p className="mt-1 text-sm text-muted">
                  Tell the sharks what you&apos;re building, how much you want,
                  and what you&apos;re giving up. They&apos;ll remember every
                  number.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <span className="font-mono text-sm text-muted">02</span>
              <div>
                <h3 className="text-base font-semibold">
                  Survive the questions
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Each shark grills you from their angle — margins, traction,
                  defensibility, team. Stumble and they&apos;ll smell blood.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <span className="font-mono text-sm text-muted">03</span>
              <div>
                <h3 className="text-base font-semibold">
                  Get offers — or get out
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Sharks who like what they hear will make offers. Counter,
                  accept, or hear why they&apos;re out. Then review your full
                  scorecard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 md:px-12">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-mono text-xs text-muted">pitchify</span>
          <span className="font-mono text-xs text-muted">
            For that reason, I&apos;m out.
          </span>
        </div>
      </footer>
    </div>
  );
}
