import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RealmScreen } from "@/components/RealmScreen";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import hallOfLegends from "@/assets/hall-of-legends.jpg";

export const Route = createFileRoute("/chat/$friendId")({
  head: () => ({
    meta: [
      { title: "Arcane Whisper — Chat | AETHORA" },
      {
        name: "description",
        content: "Send messages to your allies through the arcane network.",
      },
    ],
  }),
  component: ChatPage,
});

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

interface FriendProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

function ChatPage() {
  const { friendId } = Route.useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load friend profile
  useEffect(() => {
    if (!friendId) return;
    void supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", friendId)
      .maybeSingle()
      .then(({ data }) => {
        setFriendProfile(data as FriendProfile | null);
      });
  }, [friendId]);

  // Load existing messages
  useEffect(() => {
    if (!user || !friendId) return;

    void supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setTimeout(scrollToBottom, 100);
      });
  }, [user, friendId, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel(`chat-${user.id}-${friendId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        } as never,
        ((payload: { new: Message }) => {
          const msg = payload.new;
          // Only add messages in this conversation
          if (
            (msg.sender_id === user.id && msg.recipient_id === friendId) ||
            (msg.sender_id === friendId && msg.recipient_id === user.id)
          ) {
            setMessages((prev) => {
              // Deduplicate by id
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            setTimeout(scrollToBottom, 50);
          }
        }) as never,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, friendId, scrollToBottom]);

  async function sendMessage() {
    if (!user || !friendId || !newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: friendId,
      content,
    });

    setSending(false);
    if (error) {
      toast.error("Message failed to send.");
      setNewMessage(content);
      return;
    }
    inputRef.current?.focus();
  }

  function getInitials(name: string | null) {
    if (!name) return "??";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  if (!user) {
    return (
      <RealmScreen
        image={hallOfLegends}
        alt="A grand hall"
        veil="strong"
        eager
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Sign in to send messages.
          </p>
        </div>
      </RealmScreen>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; items: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.created_at, items: [] });
    }
    groupedMessages[groupedMessages.length - 1]!.items.push(msg);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Chat Header */}
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => void navigate({ to: "/friends" })}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-primary"
            aria-label="Back to friends"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-display text-xs font-bold text-primary">
            {friendProfile?.avatar_url ? (
              <img
                src={friendProfile.avatar_url}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              getInitials(friendProfile?.display_name ?? null)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {friendProfile?.display_name ?? "Warrior"}
            </p>
            <p className="text-[0.65rem] text-muted-foreground">
              Arcane Whisper
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <div className="mx-auto max-w-lg space-y-1">
          {groupedMessages.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                <Send className="h-6 w-6 text-primary/40" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No messages yet. Break the silence!
              </p>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 py-3">
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {formatDate(group.date)}
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              {group.items.map((msg) => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "mb-1 flex",
                      isMine ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        isMine
                          ? "rounded-br-md border border-primary/30 bg-primary/15 text-foreground"
                          : "rounded-bl-md border border-border/60 bg-card text-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[0.58rem]",
                          isMine ? "text-primary/60" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 border-t border-primary/20 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Whisper through the arcane..."
            className="min-h-10 flex-1 rounded-xl border border-border/70 bg-background/60 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!newMessage.trim() || sending}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
              newMessage.trim() && !sending
                ? "bg-primary text-background shadow-[0_0_16px_var(--primary)]"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Import toast for inline error display
import { toast } from "sonner";
