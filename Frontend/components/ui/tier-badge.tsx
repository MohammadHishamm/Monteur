"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Award, Medal, Crown, Gem } from "lucide-react";

type TierType = "bronze" | "silver" | "gold" | "platinum";

interface TierBadgeProps {
  tier: TierType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const tierConfig: Record<
  TierType,
  { name: string; color: string; Icon: React.ElementType }
> = {
  bronze:   { name: "Bronze",   color: "var(--tier-bronze)",   Icon: Award },
  silver:   { name: "Silver",   color: "var(--tier-silver)",   Icon: Medal },
  gold:     { name: "Gold",     color: "var(--tier-gold)",     Icon: Crown },
  platinum: { name: "Platinum", color: "var(--tier-platinum)", Icon: Gem },
};

const sizes = {
  sm: "h-5 gap-1 px-1.5 text-[11px] [&_svg]:size-3",
  md: "h-6 gap-1.5 px-2 text-xs [&_svg]:size-3.5",
  lg: "h-7 gap-1.5 px-2.5 text-sm [&_svg]:size-4",
};

export function TierBadge({ tier, size = "md", showIcon = true, className }: TierBadgeProps) {
  const { name, color, Icon } = tierConfig[tier];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold tracking-wide whitespace-nowrap",
        sizes[size],
        className
      )}
      style={{
        color,
        borderColor: `color-mix(in oklch, ${color}, transparent 70%)`,
        backgroundColor: `color-mix(in oklch, ${color}, transparent 90%)`,
      }}
    >
      {showIcon && <Icon strokeWidth={2} />}
      {name}
    </span>
  );
}
