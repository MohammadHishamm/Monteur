import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}

export function RatingStars({
  value,
  count,
  size = 14,
  showValue = true,
  className,
}: RatingStarsProps) {
  const rounded = Math.round(value * 2) / 2;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-0.5 text-gold">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= rounded;
          const half = !filled && i - 0.5 === rounded;
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(filled || half ? "fill-current" : "fill-none text-border")}
              strokeWidth={1.5}
            />
          );
        })}
      </span>
      {showValue && (
        <span className="font-mono text-xs font-medium text-foreground tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </span>
  );
}
