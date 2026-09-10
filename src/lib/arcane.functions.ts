/**
 * Arcane Guide — client-safe facade.
 *
 * Web (SSR/Nitro): routes through the TanStack Start server function in
 * arcane.remote.ts, which calls Google Gemini with the server-side
 * NEW_API_KEY. The key itself never reaches the browser.
 *
 * Native (Capacitor Android): POSTs to the production /api/guide endpoint
 * (the key stays server-side on Vercel — never in the APK). Failures
 * surface as "DEBUG ERROR (...)" replies that pinpoint the exact stage:
 * fetch failure, HTTP status, bad JSON, or missing reply field.
 *
 * Uses Content-Type: text/plain (not application/json) on the native POST
 * so the browser/WebView treats it as a "simple request" and skips the
 * CORS preflight (OPTIONS) entirely — the server still parses the body as
 * JSON manually.
 *
 * Any unexpected failure resolves to the gentle placeholder reply — the
 * Guide page can never crash.
 *
 * `guide.tsx` only consumes `{ reply: string }`.
 */

export interface ArcaneMessage {
  role: "user" | "model";
  text: string;
}

/* ---- Build version marker (injected by vite.config.android.ts) ---- */
declare const __BUILD_SHA__: string | undefined;

const BUILD_SHA: string = __BUILD_SHA__ ?? "dev";

/** Returns the short git SHA of the build that produced this bundle. */
export function getBuildSha(): string {
  return BUILD_SHA;
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
          headers: { "Content-Type": "text/plain" },
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