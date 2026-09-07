import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Copy,
  MessageCircle,
  UserPlus,
  Users,
  X,
  Check,
  Clock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import hallOfLegends from "@/assets/hall-of-legends.jpg";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Hall of Allies — Friends | AETHORA" },
      {
        name: "description",
        content:
          "Find fellow warriors, forge alliances, and send messages through the arcane network.",
      },
    ],
  }),
  component: FriendsPage,
});

interface FriendProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  friend_code: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_profile?: FriendProfile | null;
  receiver_profile?: FriendProfile | null;
}

interface Friendship {
  user_id_1: string;
  user_id_2: string;
  created_at: string;
  other_profile?: FriendProfile | null;
}

function FriendsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myCode, setMyCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, friend_code")
      .eq("id", userId)
      .maybeSingle();
    return data as FriendProfile | null;
  }, []);

  const loadFriends = useCallback(async () => {
    if (!user) return;

    // Get my profile code
    const { data: me } = await supabase
      .from("profiles")
      .select("friend_code")
      .eq("id", user.id)
      .maybeSingle();
    if (me?.friend_code) setMyCode(me.friend_code);

    // Get accepted friendships
    const { data: friRow } = await supabase
      .from("friendships" as never)
      .select("*")
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const friendshipRows = (friRow ?? []) as Friendship[];
    // Enrich with other user's profile
    const enriched: Friendship[] = await Promise.all(
      friendshipRows.map(async (f) => {
        const otherId =
          f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
        const profile = await fetchProfile(otherId);
        return { ...f, other_profile: profile };
      }),
    );
    setFriends(enriched);

    // Get pending received requests
    const { data: recvRows } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    const recvEnriched: FriendRequest[] = await Promise.all(
      ((recvRows ?? []) as FriendRequest[]).map(async (r) => {
        const profile = await fetchProfile(r.sender_id);
        return { ...r, sender_profile: profile };
      }),
    );
    setPendingReceived(recvEnriched);

    // Get pending sent requests
    const { data: sentRows } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("sender_id", user.id)
      .eq("status", "pending");

    const sentEnriched: FriendRequest[] = await Promise.all(
      ((sentRows ?? []) as FriendRequest[]).map(async (r) => {
        const profile = await fetchProfile(r.receiver_id);
        return { ...r, receiver_profile: profile };
      }),
    );
    setPendingSent(sentEnriched);
    setLoading(false);
  }, [user, fetchProfile]);

  useEffect(() => {
    if (user) void loadFriends();
    else setLoading(false);
  }, [user, loadFriends]);

  async function sendFriendRequest() {
    if (!user || !inputCode.trim()) return;
    const code = inputCode.trim().toUpperCase();
    if (code === myCode) {
      toast.error("You cannot add yourself.");
      return;
    }
    setSending(true);

    // Look up the target user by friend_code
    const { data: target } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("friend_code", code)
      .maybeSingle();

    if (!target) {
      toast.error("No warrior found with that code.");
      setSending(false);
      return;
    }

    // Check if already friends
    const { data: existingFriendship } = await supabase
      .from("friendships" as never)
      .select("user_id_1")
      .or(
        `and(user_id_1.eq.${user.id},user_id_2.eq.${target.id}),and(user_id_1.eq.${target.id},user_id_2.eq.${user.id})`,
      )
      .maybeSingle();

    if (existingFriendship) {
      toast("Already allies with this warrior.");
      setSending(false);
      setInputCode("");
      return;
    }

    // Check if there's already a pending request in either direction
    const { data: existingReq } = await supabase
      .from("friend_requests")
      .select("id, status")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${user.id})`,
      )
      .in("status", ["pending"])
      .maybeSingle();

    if (existingReq) {
      toast("A request is already pending with this warrior.");
      setSending(false);
      setInputCode("");
      return;
    }

    const { error } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: target.id,
      status: "pending",
    });

    setSending(false);
    if (error) {
      toast.error("Could not send request.");
      return;
    }
    toast.success(`Request sent to ${target.display_name ?? "warrior"}.`);
    setInputCode("");
    void loadFriends();
  }

  async function acceptRequest(requestId: string) {
    if (!user) return;

    const { data: req } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("id", requestId)
      .maybeSingle();

    if (!req) return;

    // Create friendship with user_id_1 < user_id_2
    const u1 = req.sender_id < req.receiver_id ? req.sender_id : req.receiver_id;
    const u2 = req.sender_id < req.receiver_id ? req.receiver_id : req.sender_id;

    const { error: friErr } = await supabase.from("friendships").insert({
      user_id_1: u1,
      user_id_2: u2,
    });

    if (friErr) {
      toast.error("Could not form alliance.");
      return;
    }

    // Update request status
    await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    toast.success("Alliance forged!");
    void loadFriends();
  }

  async function declineRequest(requestId: string) {
    await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", requestId);
    toast("Request declined.");
    void loadFriends();
  }

  async function copyCode() {
    if (!myCode) return;
    await navigator.clipboard?.writeText(myCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
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

  if (!user) {
    return (
      <RealmScreen
        image={hallOfLegends}
        alt="A grand hall with torches"
        veil="strong"
      >
        <header className="pt-10 text-center">
          <RuneHeading>Hall of Allies</RuneHeading>
          <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
            Join the Alliance
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Sign in to find fellow warriors and forge alliances.
          </p>
        </header>
        <RunePanel className="mt-6 text-center">
          <Users className="mx-auto h-8 w-8 text-primary/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            Bind your legend to the arcane archives first.
          </p>
          <Link to="/auth" className="btn-gold mt-4">
            <Shield className="h-4 w-4" /> Swear Your Oath
          </Link>
        </RunePanel>
      </RealmScreen>
    );
  }

  return (
    <RealmScreen
      image={hallOfLegends}
      alt="A grand hall with torches and banners"
      imagePosition="center 30%"
      veil="soft"
    >
      <header className="pt-10 text-center">
        <RuneHeading>Hall of Allies</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          Your Fellowship
        </h1>
      </header>

      {/* My Friend Code */}
      <RunePanel className="mt-6">
        <div className="flex items-start gap-3">
          <Users className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">Your Code</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this code so other warriors can find you.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-bold tracking-widest text-primary">
              {myCode || "····"}
            </code>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="btn-rune-ghost !w-auto px-3 py-2"
              aria-label="Copy code"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </RunePanel>

      {/* Add Friend by Code */}
      <RunePanel className="mt-4">
        <RuneHeading>Add a Warrior</RuneHeading>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a friend's code to send a request.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="AETH-XXXX"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase tracking-wider"
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendFriendRequest();
            }}
          />
          <button
            type="button"
            onClick={() => void sendFriendRequest()}
            disabled={sending || !inputCode.trim()}
            className="btn-gold !w-auto px-4"
          >
            <UserPlus className="h-4 w-4" /> Add
          </button>
        </div>
      </RunePanel>

      {/* Pending Requests */}
      {pendingReceived.length > 0 && (
        <RunePanel className="mt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <RuneHeading>Incoming Requests</RuneHeading>
          </div>
          <ul className="mt-3 space-y-2">
            {pendingReceived.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-display text-sm font-bold text-primary">
                  {getInitials(req.sender_profile?.display_name ?? null)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {req.sender_profile?.display_name ?? "Unknown Warrior"}
                  </p>
                  <p className="font-mono text-[0.65rem] text-muted-foreground">
                    {req.sender_profile?.friend_code}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void acceptRequest(req.id)}
                    className="rounded-md border border-green-500/40 bg-green-500/10 p-2 text-green-400 transition-colors hover:bg-green-500/20"
                    aria-label="Accept"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void declineRequest(req.id)}
                    className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                    aria-label="Decline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </RunePanel>
      )}

      {/* Sent Requests */}
      {pendingSent.length > 0 && (
        <RunePanel className="mt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary/60" />
            <RuneHeading>Sent Requests</RuneHeading>
          </div>
          <ul className="mt-3 space-y-2">
            {pendingSent.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5 opacity-70"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 font-display text-sm font-bold text-primary/60">
                  {getInitials(req.receiver_profile?.display_name ?? null)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {req.receiver_profile?.display_name ?? "Unknown Warrior"}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    Awaiting response...
                  </p>
                </div>
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </RunePanel>
      )}

      {/* Friends List */}
      <RunePanel className="mt-4">
        <RuneHeading>Allies</RuneHeading>
        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md border border-border/30 bg-muted/30"
              />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No allies yet. Send a request to forge your first alliance.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {friends.map((f) => {
              const other = f.other_profile;
              return (
                <li
                  key={`${f.user_id_1}-${f.user_id_2}`}
                  className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 font-display text-sm font-bold text-primary">
                    {other?.avatar_url ? (
                      <img
                        src={other.avatar_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(other?.display_name ?? null)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {other?.display_name ?? "Unknown Warrior"}
                    </p>
                    <p className="font-mono text-[0.65rem] text-muted-foreground">
                      {other?.friend_code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({
                        to: "/chat/$friendId",
                        params: { friendId: other?.id ?? "" },
                      })
                    }
                    className="btn-rune-ghost !w-auto px-3 py-2"
                  >
                    <MessageCircle className="h-4 w-4" /> Message
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </RunePanel>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <RunePanel>
          <strong className="block text-2xl font-black text-primary">
            {friends.length}
          </strong>
          <span className="text-xs text-muted-foreground">Allies</span>
        </RunePanel>
        <RunePanel>
          <strong className="block text-2xl font-black text-primary">
            {pendingReceived.length}
          </strong>
          <span className="text-xs text-muted-foreground">Requests</span>
        </RunePanel>
      </div>
    </RealmScreen>
  );
}
