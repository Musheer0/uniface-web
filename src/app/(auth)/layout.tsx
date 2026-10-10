import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
