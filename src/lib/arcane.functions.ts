/**
 * Arcane Guide — placeholder channel.
 *
 * The previous Gemini integration (server fetch + GEMINI_API_KEY) has been
 * removed. `consultArcaneGuide` is now a safe no-op that always resolves with
 * a gentle "the Guide is resting" reply, so no page can crash while a new
 * provider is being wired in. Swap the body of `consultArcaneGuide` for the
 * new provider's call when it is ready — `guide.tsx` only consumes
 * `{ reply: string }`.
 */

export interface ArcaneMessage {
  role: "user" | "model";
  text: string;
}

export async function consultArcaneGuide(
  _messages: ArcaneMessage[],
): Promise<{ reply: string }> {
  void _messages;
  return {
    reply:
      "The Arcane Guide rests his quill for a moment. His voice will return to the library soon, traveler — ask again once the new channel is open.",
  };
}
