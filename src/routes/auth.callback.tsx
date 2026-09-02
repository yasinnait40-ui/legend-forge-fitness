import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Opening the Realm | AETHORA" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Opening the realm...");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    const errorDescription = query.get("error_description");

    async function finishAuth() {
      if (errorDescription) {
        if (active) {
          setMessage("The Google oath was declined. Please try again.");
          toast.error("Google sign-in was not completed.");
        }
        return;
      }
      if (!code) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (active) void navigate({ to: "/", replace: true });
          return;
        }
        if (active) setMessage("This authentication link is incomplete or expired.");
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (active) {
          setMessage("We could not complete sign-in. Please return to the Oath Stone.");
          toast.error("Authentication could not be completed.");
        }
        return;
      }
      if (active) void navigate({ to: "/", replace: true });
    }

    void finishAuth();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-muted-foreground">
      {message}
    </main>
  );
}
