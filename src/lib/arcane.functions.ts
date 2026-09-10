export interface ArcaneMessage {
  role: "user" | "model";
  text: string;
}

const PLACEHOLDER_REPLY =
  "The Arcane Guide rests his quill for a moment. His voice will return to the library soon, traveler — ask again once the new channel is open.";

const PROD_BASE_URL = "https://legend-forge-fitness.vercel.app";

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function consultArcaneGuide(
  messages: ArcaneMessage[],
): Promise<{ reply: string }> {
  try {
    if (await isNative()) {
      const res = await fetch(`${PROD_BASE_URL}/api/guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) return { reply: PLACEHOLDER_REPLY };
      const result = (await res.json()) as { reply?: string };
      if (result && typeof result.reply === "string" && result.reply.trim()) {
        return { reply: result.reply };
      }
      return { reply: PLACEHOLDER_REPLY };
    }

    const { consultArcaneGuide: remote } = await import("./arcane.remote");
    const result = await remote({ data: { messages } });
    if (result && typeof result.reply === "string" && result.reply.trim()) {
      return result;
    }
    return { reply: PLACEHOLDER_REPLY };
  } catch {
    return { reply: PLACEHOLDER_REPLY };
  }
}