import Link from "next/link";
import SharkSceneLoader from "@/components/shark-scene-loader";
import { JudgeBrowser } from "@/components/judge-browser";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <span className="font-mono text-sm font-semibold tracking-tight">
          pitchify
        </span>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Start pitching
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center px-6 pt-16 md:pt-28">
        <div className="flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row lg:items-center">
          {/* Left */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl lg:text-[4.25rem]">
              Pitch to a panel
              <br />
              that doesn&apos;t
              <br />
              <span className="italic">go easy.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-muted-foreground lg:mx-0">
              Five AI investors with distinct philosophies. They remember every
              number, catch every contradiction, and won&apos;t pretend to be
              impressed.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Enter the tank
              </Link>
              <Link
                href="#judges"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                )}
              >
                Meet the judges
              </Link>
            </div>
          </div>

          {/* Right: 3D shark */}
          <div className="relative flex-1 w-full max-w-sm">
            <SharkSceneLoader />
          </div>
        </div>
      </section>

      {/* Judges — interactive browser */}
      <section id="judges" className="px-6 py-32 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            The panel
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Five investors. Five angles.
          </h2>
          <div className="mt-10">
            <JudgeBrowser />
          </div>
        </div>
      </section>

      {/* How it works — vertical rhythm, no numbered cards */}
      <section className="border-t px-6 py-32 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-16 md:grid-cols-3 md:gap-8">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                Configure
              </p>
              <h3 className="mt-2 text-base font-semibold">
                Bring your idea or get one
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Describe your product in a sentence, or let the system generate
                a challenge for you. Set your valuation and equity offer.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                Present
              </p>
              <h3 className="mt-2 text-base font-semibold">
                Pitch live on camera
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Speak directly to the panel. They listen, interrupt, and follow
                up. Every session is a live conversation — not a form.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                Learn
              </p>
              <h3 className="mt-2 text-base font-semibold">
                Get real decisions
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Each judge makes an independent call: invest, counter-offer, or
                pass. You get a scorecard explaining exactly where you were
                strong and where you lost them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Your pitch needs pressure.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            No account required. Pick a product, turn on your camera, and
            find out if you&apos;d survive the tank.
          </p>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }), "mt-8")}
          >
            Launch a session
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 md:px-12">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            pitchify
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            For that reason, I&apos;m out.
          </span>
        </div>
      </footer>
    </div>
  );
}
