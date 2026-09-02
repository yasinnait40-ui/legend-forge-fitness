import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the callback URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          toast.error("Authentication failed. Please try again.");
          void navigate({ to: "/auth", replace: true });
          return;
        }

        if (data.session) {
          toast.success("Your oath is sworn — welcome, warrior.");
          void navigate({ to: "/", replace: true });
        } else {
          // Session not established yet, redirect to auth
          void navigate({ to: "/auth", replace: true });
        }
      } catch (err) {
        console.error("Callback processing error:", err);
        toast.error("An error occurred during authentication.");
        void navigate({ to: "/auth", replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    void handleCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 inline-block">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border/30 border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {isProcessing ? "Binding your oath to the arcane archives..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}
