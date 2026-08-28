import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function RunePanel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rune-panel p-4", className)} {...rest} />;
}

export function RuneHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rune-heading", className)}>
      <h2 className="font-display text-[0.72rem] font-bold uppercase tracking-[0.28em] text-primary">
        {children}
      </h2>
    </div>
  );
}
