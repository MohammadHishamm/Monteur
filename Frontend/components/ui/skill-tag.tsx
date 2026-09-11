"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface SkillTagProps {
  skill: string;
  level?: 'beginner' | 'intermediate' | 'expert';
  variant?: 'default' | 'outlined' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

// One accent: every level reads emerald. Proficiency is conveyed by the dot
// fill (hollow → solid), not by hue.
const levelColors = {
  beginner: {
    bg: 'bg-emerald-tint',
    border: 'border-primary/20',
    text: 'text-emerald-strong',
    dot: 'bg-primary/40'
  },
  intermediate: {
    bg: 'bg-emerald-tint',
    border: 'border-primary/30',
    text: 'text-emerald-strong',
    dot: 'bg-primary/70'
  },
  expert: {
    bg: 'bg-emerald-tint',
    border: 'border-primary/40',
    text: 'text-emerald-strong',
    dot: 'bg-primary'
  }
};

export function SkillTag({
  skill,
  level,
  variant = 'default',
  size = 'md',
  interactive = false,
  className,
  onClick
}: SkillTagProps) {
  const levelConfig = level ? levelColors[level] : null;

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variants = {
    default: cn(
      levelConfig ? [levelConfig.bg, levelConfig.text, levelConfig.border] : [
        'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200'
      ],
      'border'
    ),
    outlined: cn(
      'bg-transparent border-2',
      levelConfig ? [levelConfig.border, levelConfig.text] : 'border-gray-300 text-gray-600'
    ),
    minimal: cn(
      'bg-gray-100 text-gray-700 border-0'
    )
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200',
        'select-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        interactive && 'cursor-pointer hover:scale-105 hover:shadow-md',
        interactive && 'active:scale-95',
        className
      )}
      onClick={onClick}
    >
      {level && (
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            levelConfig?.dot
          )}
        />
      )}

      <span className="font-semibold tracking-wide">
        {skill}
      </span>
    </span>
  );
}