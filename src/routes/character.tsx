import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Eye,
  Flame,
  Gem,
  Heart,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Orbit,
  RotateCcw,
  Shield,
  ShieldCheck,
  Shirt,
  Star,
  Sword,
  Swords,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import warriorChamber from "@/assets/warrior-chamber.jpg";
import arcaneWarrior from "@/assets/arcane-warrior.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { StatBar } from "@/components/StatBar";
import { equipItem, resetLegend, useGame } from "@/lib/game-store";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { stopCloudSync } from "@/lib/cloud-sync";
import {
  EQUIPMENT,
  levelFromXp,
  levelProgress,
  titleForLevel,
  SLOT_LABELS,
  STAT_ORDER,
  type EquipSlot,
} from "@/lib/game-data";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/character")({
  head: () => ({
    meta: [
      { title: "The Warrior's Chamber — Character & Equipment | AETHORA" },
      {
        name: "description",
        content:
          "Your hero's chamber: level, title, attributes, and a cosmetic armory of swords, armor and magical relics that unlock as you level.",
      },
      { property: "og:title", content: "The Warrior's Chamber — Character & Equipment | AETHORA" },
      {
        property: "og:description",
        content: "Armor, weapons and relics await. Grow stronger and unlock legendary gear.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharacterPage,
});

const EQUIP_ICONS = {
  sword: Sword,
  "flame-sword": Flame,
  "moon-sword": Moon,
  swords: Swords,
  shirt: Shirt,
  shield: Shield,
  "shield-glow": ShieldCheck,
  "star-shield": Star,
  gem: Gem,
  amulet: Orbit,
  eye: Eye,
  heart: Heart,
} as const;

const SLOTS: EquipSlot[] = ["weapon", "armor", "relic"];

function CharacterPage() {
  const { t } = useTranslation();
  const game = useGame();
  const { user } = useAuth();
  const level = levelFromXp(game.xp);
  const { intoLevel, needed, ratio } = levelProgress(game.xp);

  return (
    <RealmScreen
      image={warriorChamber}
      alt="A warrior's castle chamber with armor, sword, shield and a warm fireplace"
      imagePosition="center 30%"
      veil="soft"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("character.warriorsChamber", "The Warrior's Chamber")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("character.title", "Your Hero")}
        </h1>
      </header>

      {/* Portrait */}
      <RunePanel className="mt-6 overflow-hidden !p-0">
        <div className="relative">
          <img
            src={arcaneWarrior}
            alt="Your arcane warrior, clad in rune-engraved armor beneath the moon"
            width={1024}
            height={1536}
            loading="lazy"
            className="h-[44dvh] w-full object-cover object-[center_14%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold leading-tight">Arcane Warrior</p>
                <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.24em] text-primary">
                  {titleForLevel(level)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[0.56rem] uppercase tracking-[0.26em] text-muted-foreground">
                  Level
                </p>
                <p className="text-glow-gold font-display text-3xl font-black text-primary">
                  {level}
                </p>
              </div>
            </div>
            <div className="bar-track mt-3 !h-2">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(2, ratio * 100)}%`,
                  background:
                    "linear-gradient(90deg, color-mix(in oklab, var(--primary) 50%, black 30%), var(--primary))",
                  boxShadow: "0 0 14px color-mix(in oklab, var(--primary) 70%, transparent)",
                }}
              />
            </div>
            <p className="font-display mt-1 text-right text-[0.62rem] font-bold text-primary">
              {intoLevel} / {needed} XP
            </p>
          </div>
        </div>
      </RunePanel>

      {/* Attributes */}
      <RunePanel className="mt-4">
        <RuneHeading>Attributes</RuneHeading>
        <div className="mt-3 space-y-3">
          {STAT_ORDER.map((s) => (
            <StatBar key={s} stat={s} value={game.stats[s]} />
          ))}
        </div>
      </RunePanel>

      {/* Equipment */}
      {SLOTS.map((slot) => (
        <RunePanel key={slot} className="mt-4">
          <RuneHeading>{SLOT_LABELS[slot]}</RuneHeading>
          <div className="mt-3 space-y-2">
            {EQUIPMENT.filter((i) => i.slot === slot).map((item) => {
              const locked = level < item.levelReq;
              const equipped = game.equipment[slot] === item.id;
              const Icon = EQUIP_ICONS[item.icon as keyof typeof EQUIP_ICONS];
              return (
                <button
                  key={item.id}
                  disabled={locked || equipped}
                  onClick={() => {
                    equipItem(slot, item.id);
                    toast.success(`${item.name} equipped`, { description: item.flavor });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all duration-200",
                    equipped
                      ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_22%,transparent)]"
                      : locked
                        ? "opacity-50"
                        : "bg-background/50 hover:border-primary/40",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      equipped ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="block text-[0.7rem] italic text-muted-foreground">
                      {item.flavor}
                    </span>
                  </span>
                  {locked ? (
                    <span className="flex shrink-0 items-center gap-1 text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                      <Lock className="h-3 w-3" /> Lv {item.levelReq}
                    </span>
                  ) : equipped ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </RunePanel>
      ))}

      {/* Hall of Legends */}
      <Link to="/achievements" className="mt-4 block">
        <RunePanel className="flex items-center gap-4 transition-shadow hover:shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
          <Trophy className="h-7 w-7 shrink-0 text-primary drop-shadow-[0_0_10px_var(--primary)]" />
          <div className="flex-1">
            <p className="font-display text-sm font-bold uppercase tracking-[0.14em]">
              Hall of Legends
            </p>
            <p className="text-xs text-muted-foreground">
              {game.achievements.length} honors claimed — behold your trophies
            </p>
          </div>
        </RunePanel>
      </Link>

      {/* Cloud binding */}
      <RunePanel className="mt-4">
        <RuneHeading>Arcane Archives</RuneHeading>
        {user ? (
          <>
            <p className="mt-3 text-sm">
              Bound as <span className="text-primary">{user.email}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your XP, attributes and streaks are mirrored to the cloud.
            </p>
            <button
              className="btn-rune-ghost mt-3"
              onClick={async () => {
                await supabase.auth.signOut();
                stopCloudSync();
                toast("Your oath is released — progress stays on this device.");
              }}
            >
              <LogOut className="h-4 w-4" /> Release the Oath
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-xs text-muted-foreground">
              Your legend lives only on this device. Swear an oath at the Oath Stone to sync it
              across the realms.
            </p>
            <Link to="/auth" className="btn-gold mt-3">
              <LogIn className="h-4 w-4" /> Bind My Legend
            </Link>
          </>
        )}
      </RunePanel>

      <button
        className="btn-rune-ghost mt-6"
        onClick={() => {
          if (
            window.confirm(
              "Abandon your legend and begin anew? All XP, stats and honors will be lost.",
            )
          ) {
            resetLegend();
            toast("The mists clear — a new legend begins.");
          }
        }}
      >
        <RotateCcw className="h-4 w-4" /> {t("character.beginAnew", "Begin Anew")}
      </button>
    </RealmScreen>
  );
}