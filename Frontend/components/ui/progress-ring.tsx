"use client";

import { cn } from '@/lib/utils';
import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  color?: string;
  showPercentage?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  children,
  className,
  color = 'oklch(0.488 0.243 264.376)',
  showPercentage = false
}: ProgressRingProps) {
  const safeSize = Number.isFinite(size) && size > 0 ? size : 120;
  const safeStrokeWidth = Number.isFinite(strokeWidth) && strokeWidth > 0
    ? Math.min(strokeWidth, safeSize)
    : 8;
  const safeProgress = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : 0;

  const center = safeSize / 2;
  const radius = Math.max(0, center - safeStrokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: safeSize, height: safeSize }}
    >
      <svg
        className="transform -rotate-90"
        width={safeSize}
        height={safeSize}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={safeStrokeWidth}
          className="fill-none stroke-muted"
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={safeStrokeWidth}
          className="fill-none transition-all duration-1000 ease-out"
          style={{
            stroke: color,
            strokeDasharray,
            strokeDashoffset,
            strokeLinecap: 'round',
          }}
        />

        {/* Glow effect */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={safeStrokeWidth / 2}
          className="fill-none opacity-20"
          style={{
            stroke: color,
            strokeDasharray,
            strokeDashoffset,
            strokeLinecap: 'round',
            filter: 'blur(3px)'
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <span className="text-2xl font-bold text-foreground">
            {Math.round(safeProgress)}%
          </span>
        ))}
      </div>
    </div>
  );
}