"use client";

import { useState, type CSSProperties } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import { Loader2, ScanFace } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

type Provider = "github" | "google";

/* ------------------------------------------------------------------ */
/* Brand icons (lucide no longer ships brand marks)                    */
/* ------------------------------------------------------------------ */

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "github", label: "Continue with GitHub", icon: <GithubIcon /> },
];

/* ------------------------------------------------------------------ */
/* Visual panel                                                        */
/* ------------------------------------------------------------------ */

const PORTRAITS = [
  { x: 0, skin: "#F0C4A8", hair: "#3A2A22", shirt: "#3B4390", blur: null },
  { x: 170, skin: "#B9795B", hair: "#1E1A1A", shirt: "#4A3F8F", blur: "uf-blur-3" },
  { x: 340, skin: "#7A4B3A", hair: "#2B1E16", shirt: "#2E5A8C", blur: "uf-blur-9" },
] as const;

/** Three detected faces, going from sharp to fully blurred. */
const FaceRow = () => (
  <svg
    viewBox="0 0 480 220"
    preserveAspectRatio="xMinYMid meet"
    className="h-full max-h-72 w-full max-w-xl"
    aria-hidden
  >
    <defs>
      <clipPath id="uf-clip">
        <rect width="140" height="200" rx="16" />
      </clipPath>
      <filter id="uf-blur-3" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
      <filter id="uf-blur-9" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
    </defs>

    {PORTRAITS.map((p) => (
      <g key={p.x} transform={`translate(${p.x} 10)`}>
        <g clipPath="url(#uf-clip)">
          <rect width="140" height="200" fill="#20244A" />
          <path d="M8 200C8 160 40 148 70 148s62 12 62 52Z" fill={p.shirt} />
          <rect x="60" y="125" width="20" height="30" rx="6" fill={p.skin} />
          <rect x="60" y="125" width="20" height="30" rx="6" fill="#000" opacity="0.12" />

          {/* Everything on the face lives in one group so one filter blurs it all */}
          <g filter={p.blur ? `url(#${p.blur})` : undefined}>
            <ellipse cx="70" cy="90" rx="34" ry="42" fill={p.skin} />
            <path
              d="M36 88C34 50 56 40 72 40c20 0 34 16 32 48-6-18-18-26-34-26S42 70 36 88Z"
              fill={p.hair}
            />
            <circle cx="56" cy="92" r="3.2" fill="#2A1B17" />
            <circle cx="84" cy="92" r="3.2" fill="#2A1B17" />
            <path d="M49 83q7-4 14 0M77 83q7-4 14 0" stroke="#2A1B17" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M70 96l-4 12h6" stroke="#000" strokeOpacity="0.25" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 118q10 6 20 0" stroke="#8A3B3B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Detection brackets */}
        <path
          d="M30 52V38h14M96 38h14v14M110 124v14H96M44 138H30v-14"
          stroke="#7C93FF"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    ))}
  </svg>
);

const fadeOutRight: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, #000 35%, transparent 78%)",
  maskImage: "linear-gradient(to right, #000 35%, transparent 78%)",
};
const fadeInRight: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, transparent 30%, #000 80%)",
  maskImage: "linear-gradient(to right, transparent 30%, #000 80%)",
};

/** The brand name resolving from sharp to blurred, left to right. */
const Wordmark = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative font-[family-name:var(--font-display)] leading-[0.9] font-bold tracking-tight select-none",
      className,
    )}
  >
    <span className="sr-only">Uniface</span>
    <span aria-hidden className="block" style={fadeOutRight}>
      uniface
    </span>
    <span
      aria-hidden
      className="absolute inset-0 block blur-[10px] motion-reduce:blur-[6px]"
      style={fadeInRight}
    >
      uniface
    </span>
  </div>
);

const VisualPanel = () => (
  <aside
    className="relative hidden min-h-0 flex-col gap-6 overflow-hidden bg-[#151834] p-8 text-[#E8EBFF] lg:flex xl:p-12"
    aria-label="About Uniface"
  >
    <div className="max-w-md shrink-0 space-y-2">
      <p className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.8vh,2.25rem)] leading-tight font-semibold">
        Blur every face in your photos and videos.
      </p>
      <p className="text-sm leading-relaxed text-[#E8EBFF]/65">
        Upload your media, let AI find each face, and export a version that is
        safe to share.
      </p>
    </div>

    {/* Takes whatever height is left between the headline and the wordmark */}
    {/*<div className="flex min-h-0 flex-1 items-center">
      <FaceRow />
    </div>*/}

    <Wordmark className="-ml-1 mt-auto shrink-0 text-[clamp(3.5rem,min(12vw,20vh),9rem)] text-[#E8EBFF]" />
  </aside>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);

  async function handleSocialLogin(provider: Provider) {
    setError(null);
    setPending(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/new",
    });
    // OAuth redirects away; this only runs on failure.
    if (error) {
      setError(error.message ?? `Could not sign in with ${provider}.`);
      setPending(null);
    }
  }

  return (
    <main
      className={cn(
        display.variable,
        // fixed + inset-0 breaks out of any narrow/centered wrapper in the auth layout
        "fixed inset-0 z-50 grid h-dvh grid-rows-[minmax(0,1fr)] overflow-hidden bg-background lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
      )}
    >
      <VisualPanel />

      <section className="flex min-h-0 flex-col overflow-y-auto px-6 py-8 sm:px-10">
        {/* m-auto centers when there's room and falls back to scrolling when there isn't */}
        <div className="m-auto w-full max-w-sm">
          {/* Compact brand for screens where the visual panel is hidden */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#151834] text-[#E8EBFF]">
              <ScanFace className="size-5" aria-hidden />
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
              Uniface
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Log in to Uniface
            </h1>
            <p className="text-sm text-muted-foreground">
              Use your GitHub or Google account. New here? Signing in creates
              your account.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive [overflow-wrap:anywhere]"
              >
                {error}
              </p>
            )}

            {PROVIDERS.map(({ id, label, icon }) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full justify-center gap-2.5"
                disabled={pending !== null}
                onClick={() => handleSocialLogin(id)}
              >
                {pending === id ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  icon
                )}
                {pending === id ? "Redirecting…" : label}
              </Button>
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to the{" "}
            <a href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}