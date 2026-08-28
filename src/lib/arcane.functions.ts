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
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "The Arcane Guide cannot be reached — the GEMINI_API_KEY secret is not configured.",
      );
    }
    const reply = await askArcaneGuide(data.messages as ArcaneMessage[], apiKey);
    return { reply };
  });
