"use client";

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  className,
  decimals = 0
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          animateCounter();
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  const animateCounter = () => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateCounter = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * value);

      setCount(currentValue);

      if (now < endTime) {
        requestAnimationFrame(updateCounter);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(updateCounter);
  };

  const formatNumber = (num: number) => {
    return decimals > 0 ? num.toFixed(decimals) : num.toString();
  };

  return (
    <span
      ref={countRef}
      className={cn(
        "inline-block tabular-nums transition-all duration-300",
        isVisible && "scale-110",
        className
      )}
    >
      {prefix}
      <span className="font-bold">
        {formatNumber(count)}
      </span>
      {suffix}
    </span>
  );
}