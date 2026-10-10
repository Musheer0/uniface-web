"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function handleSocialLogin(provider: "github" | "google") {
    setError(null);
    setPending(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
    });
    // OAuth redirects away; this only runs on failure.
    if (error) {
      setError(error.message ?? `Could not sign in with ${provider}.`);
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>
          Continue with a provider to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pending !== null}
          onClick={() => handleSocialLogin("github")}
        >
          {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending !== null}
          onClick={() => handleSocialLogin("google")}
        >
          {pending === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
      </CardContent>
    </Card>
  );
}
