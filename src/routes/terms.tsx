import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/LegalDocument";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Aethora — Terms of Service" }] }),
  component: () => <LegalDocument kind="terms" />,
});
