"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  glowEffect?: boolean;
  intensity?: number;
  perspective?: boolean;
  onClick?: () => void;
}

export function FloatingCard({
  children,
  className,
  accent = false,
  glowEffect = false,
  onClick,
  intensity: _intensity,
  perspective: _perspective,
}: FloatingCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-lg transition-all duration-200",
        "bg-card border border-white/[0.07]",
        "shadow-[0_1px_3px_oklch(0_0_0/0.4)]",
        "hover:border-white/[0.12] hover:shadow-[0_4px_16px_oklch(0_0_0/0.5)]",
        accent && "border-l-2 border-l-primary",
        glowEffect && "hover:shadow-[0_4px_24px_oklch(0_0_0/0.6),0_0_0_1px_oklch(0.60_0.20_264/0.08)]",
        className
      )}
    >
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}
