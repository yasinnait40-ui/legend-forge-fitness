/**
 * Arcane Guide — client-safe facade.
 *
 * Web (SSR/Nitro): routes through the TanStack Start server function in
 * arcane.remote.ts, which calls Google Gemini with the server-side
 * NEW_API_KEY. The key itself never reaches the browser.
 *
 * Native / offline: the dynamic import keeps `@tanstack/react-start` out of
 * the mobile SPA's eager bundle, and any failure resolves to the gentle
 * placeholder reply instead of throwing — the Guide page can never crash.
 *
 * `guide.tsx` only consumes `{ reply: string }`.
 */

export interface ArcaneMessage {
  role: "user" | "model";
  text: string;
}

const PLACEHOLDER_REPLY =
  "The Arcane Guide rests his quill for a moment. His voice will return to the library soon, traveler — ask again once the new channel is open.";

export async function consultArcaneGuide(
  messages: ArcaneMessage[],
): Promise<{ reply: string }> {
  try {
    const { consultArcaneGuide: remote } = await import("./arcane.remote");
    const result = await remote({ data: { messages } });
    if (result && typeof result.reply === "string" && result.reply.trim()) {
      return result;
    }
    return { reply: PLACEHOLDER_REPLY };
  } catch {
    // Server function unavailable (native app, offline, missing key) — the
    // Guide answers with the resting-quill message instead of crashing.
    return { reply: PLACEHOLDER_REPLY };
  }
}
