import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/LegalDocument";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Aethora — Privacy Policy" }] }),
  component: () => <LegalDocument kind="privacy" />,
});
