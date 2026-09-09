// TanStack Start server function — the ONLY place NEW_API_KEY is read.
// Runs server-side on web (Nitro); never ships in the mobile SPA bundle
// (imported only via a dynamic import in arcane.functions.ts).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askArcaneGuide, type ArcaneMessage } from "./arcane.server";

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(4000),
});

export const consultArcaneGuide = createServerFn({ method: "POST" })
  .validator((data) => z.object({ messages: z.array(messageSchema).min(1).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["NEW_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "The Arcane Guide cannot be reached — the NEW_API_KEY secret is not configured on the server.",
      );
    }
    const reply = await askArcaneGuide(data.messages as ArcaneMessage[], apiKey);
    return { reply };
  });
