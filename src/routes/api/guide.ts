import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import { askArcaneGuide, type ArcaneMessage } from "@/lib/arcane.server";

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(4000),
});
const bodySchema = z.object({ messages: z.array(messageSchema).min(1).max(40) });

function withCors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export const APIRoute = createAPIFileRoute("/api/guide")({
  OPTIONS: async () => {
    return withCors(new Response(null, { status: 204 }));
  },
  POST: async ({ request }) => {
    const apiKey = process.env["NEW_API_KEY"];
    if (!apiKey) {
      return withCors(
        new Response(JSON.stringify({ error: "missing key" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    try {
      const json = await request.json();
      const parsed = bodySchema.parse(json);
      const reply = await askArcaneGuide(parsed.messages as ArcaneMessage[], apiKey);
      return withCors(
        new Response(JSON.stringify({ reply }), {
          headers: { "content-type": "application/json" },
        }),
      );
    } catch {
      return withCors(
        new Response(JSON.stringify({ error: "bad request" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      );
    }
  },
});