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
      let res: Response;
      try {
        res = await fetch(`${PROD_BASE_URL}/api/guide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        return { reply: `DEBUG ERROR (fetch failed): ${msg}` };
      }

      if (!res.ok) {
        let bodyText = "";
        try {
          bodyText = await res.text();
        } catch {
          // ignore
        }
        return {
          reply: `DEBUG ERROR (HTTP ${res.status}): ${bodyText.slice(0, 300)}`,
        };
      }

      let result: { reply?: string; error?: string };
      try {
        result = (await res.json()) as { reply?: string; error?: string };
      } catch (jsonErr) {
        const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
        return { reply: `DEBUG ERROR (bad JSON): ${msg}` };
      }

      if (result && typeof result.reply === "string" && result.reply.trim()) {
        return { reply: result.reply };
      }
      return {
        reply: `DEBUG ERROR (no reply field): ${JSON.stringify(result)}`,
      };
    }

    const { consultArcaneGuide: remote } = await import("./arcane.remote");
    const result = await remote({ data: { messages } });
    if (result && typeof result.reply === "string" && result.reply.trim()) {
      return result;
    }
    return { reply: PLACEHOLDER_REPLY };
  } catch (e) {
    console.error("[arcane] consult failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return { reply: `DEBUG ERROR (outer catch): ${msg}` };
  }
}