import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Send, Sparkles, WandSparkles } from "lucide-react";
import arcaneLibrary from "@/assets/arcane-library.jpg";
import { Particles } from "@/components/Particles";
import { consultArcaneGuide } from "@/lib/arcane.functions";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "The Arcane Guide — Your Wizard Mentor | AETHORA" },
      {
        name: "description",
        content:
          "Enter the ancient arcane library and consult the Arcane Guide — a wise wizard who answers questions about workouts, technique, nutrition, recovery and motivation.",
      },
      { property: "og:title", content: "The Arcane Guide — Your Wizard Mentor | AETHORA" },
      {
        property: "og:description",
        content: "An ancient wizard awaits in the great library. Ask, and be guided.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidePage,
});

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const GREETING: ChatMessage = {
  role: "model",
  text: "You have returned, traveler. What shall we improve today?",
};

const SUGGESTED_PROMPTS = [
  "Create today's quest.",
  "Build me a workout.",
  "I only have 20 minutes.",
  "How can I improve my endurance?",
  "What should I eat after training?",
];

const CHAT_KEY = "aethora-arcane-chat-v1";

function GuidePage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastPayload = useRef<ChatMessage[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore the conversation once, on the client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // corrupted — start a fresh conversation
    }
    setLoaded(true);
  }, []);

  // Persist conversation history.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // storage unavailable
    }
  }, [messages, loaded]);

  // Keep the latest words in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    const payload = next.slice(-20);
    lastPayload.current = payload;
    try {
      const { reply } = await consultArcaneGuide({ data: { messages: payload } });
      setMessages((m) => [...m, { role: "model", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The arcane channel faltered.");
    } finally {
      setLoading(false);
    }
  }

  async function retry() {
    if (!lastPayload.current || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { reply } = await consultArcaneGuide({ data: { messages: lastPayload.current } });
      setMessages((m) => [...m, { role: "model", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The arcane channel faltered.");
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    setMessages([GREETING]);
    setError(null);
    lastPayload.current = null;
    try {
      localStorage.removeItem(CHAT_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* Library atmosphere */}
      <div className="fixed inset-0 -z-10">
        <img
          src={arcaneLibrary}
          alt="The Arcane Guide, an elderly wizard reading at a candlelit desk in a vast library"
          width={1024}
          height={1536}
          loading="eager"
          className={cn(
            "h-full w-full object-cover transition-all duration-1000",
            loading ? "scale-[1.03] brightness-110 saturate-125" : "",
          )}
          style={{ objectPosition: "center 28%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background/95" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0">
        <Particles count={10} />
      </div>

      {/* The wizard's presence */}
      <header className="relative z-10 shrink-0">
        <div className="mx-auto flex max-w-lg items-start justify-between px-4 pt-6">
          <div>
            <p className="font-display text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-accent">
              {t("guide.grandLibrary", "The Grand Library")}
            </p>
            <h1 className="text-glow-arcane font-display mt-1 text-2xl font-black tracking-[0.06em] text-foreground">
              {t("guide.title", "The Arcane Guide")}
            </h1>
          </div>
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 rounded-md border border-primary/35 bg-background/55 px-3 py-2 backdrop-blur-md transition-colors hover:border-primary/60"
            title="Begin a new conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span className="font-display text-[0.58rem] font-bold uppercase tracking-[0.16em] text-primary">
              {t("guide.newTale", "New Tale")}
            </span>
          </button>
        </div>

        {/* Spacer where the wizard sits — spell effects gather while he thinks */}
        <div className="relative h-[24dvh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-24 w-24">
                <div className="rune-ring absolute inset-0" />
                <div className="rune-ring rune-ring-reverse absolute inset-3" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <WandSparkles className="glow-pulse h-6 w-6 text-accent" />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Conversation scroll */}
      <main
        ref={scrollRef}
        className="fancy-scroll relative z-10 mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-3"
      >
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[86%] px-3.5 py-2.5",
                  m.role === "user" ? "scroll-bubble-user" : "scroll-bubble-guide",
                )}
              >
                {m.role === "model" && (
                  <p className="font-display mb-1 flex items-center gap-1.5 text-[0.55rem] font-bold uppercase tracking-[0.22em] text-accent">
                    <WandSparkles className="h-3 w-3" /> Arcane Guide
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="scroll-bubble-guide px-3.5 py-2.5">
                <p className="font-display mb-1 flex items-center gap-1.5 text-[0.55rem] font-bold uppercase tracking-[0.22em] text-accent">
                  <WandSparkles className="h-3 w-3" /> Arcane Guide
                </p>
                <p className="glow-pulse text-sm italic text-muted-foreground">
                  The Guide weaves a spell of wisdom…
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/15 px-3.5 py-3 backdrop-blur-md">
              <p className="text-sm font-semibold text-destructive-foreground">
                The arcane channel faltered
              </p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{error}</p>
              <button onClick={retry} className="btn-rune-ghost mt-2.5 !w-auto !px-4 !py-2">
                Retry the Incantation
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Suggested incantations */}
      {messages.length <= 1 && !loading && (
        <div className="relative z-10 mx-auto w-full max-w-lg shrink-0 px-4 pb-2">
          <div className="fancy-scroll flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="shrink-0 rounded-full border border-accent/40 bg-background/60 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-md transition-colors hover:border-accent/70 hover:bg-accent/15"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Speak to the Guide */}
      <footer
        className="relative z-10 mx-auto w-full max-w-lg shrink-0 px-4"
        style={{ paddingBottom: "calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("guide.askPlaceholder", "Ask the Arcane Guide…")}
            maxLength={1000}
            className="h-12 flex-1 rounded-lg border border-input bg-background/70 px-4 text-sm text-foreground backdrop-blur-md placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-gold !h-12 !w-12 shrink-0 !rounded-lg !p-0"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </footer>

      {/* Ambient sparkle hint */}
      {!loading && messages.length <= 1 && (
        <div className="pointer-events-none absolute left-1/2 top-[30dvh] z-10 -translate-x-1/2">
          <Sparkles className="float-slow h-5 w-5 text-accent/70" />
        </div>
      )}
    </div>
  );
}