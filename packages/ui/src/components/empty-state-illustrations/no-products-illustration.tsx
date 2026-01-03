"use client";

import { cn } from "../../lib/utils";

interface NoProductsIllustrationProps {
  className?: string;
  animated?: boolean;
  intensity?: "subtle" | "moderate" | "vibrant";
}

export function NoProductsIllustration({
  className,
  animated = true,
  intensity = "moderate",
}: NoProductsIllustrationProps) {
  const intensityClass = animated ? `animation-${intensity}` : "";

  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(intensityClass, className)}
      role="img"
      aria-hidden="true"
    >
      {/* Background glow/shadow */}
      <ellipse
        cx="100"
        cy="138"
        rx="50"
        ry="8"
        className="fill-foreground/5"
      />

      {/* Floating sparkle 1 */}
      <g className={cn(animated && "animate-float-gentle")}>
        <path
          d="M35 30 L37 35 L42 37 L37 39 L35 44 L33 39 L28 37 L33 35 Z"
          className="fill-primary/25"
        />
      </g>

      {/* Floating sparkle 2 */}
      <g className={cn(animated && "animate-float-secondary")}>
        <path
          d="M170 55 L171.5 58.5 L175 60 L171.5 61.5 L170 65 L168.5 61.5 L165 60 L168.5 58.5 Z"
          className="fill-primary/20"
        />
      </g>

      {/* Product grid (empty boxes) */}
      <g className="stroke-foreground/15 fill-primary/3">
        {/* Box 1 */}
        <rect
          x="50"
          y="60"
          width="40"
          height="35"
          rx="4"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        {/* Box 2 */}
        <rect
          x="95"
          y="60"
          width="40"
          height="35"
          rx="4"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        {/* Box 3 */}
        <rect
          x="50"
          y="100"
          width="40"
          height="35"
          rx="4"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        {/* Box 4 */}
        <rect
          x="95"
          y="100"
          width="40"
          height="35"
          rx="4"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
      </g>

      {/* Main magnifying glass */}
      <g>
        {/* Glass circle */}
        <circle
          cx="110"
          cy="85"
          r="30"
          strokeWidth="4"
          className="stroke-foreground/25 fill-background/50"
        />
        {/* Inner circle highlight */}
        <circle
          cx="100"
          cy="78"
          r="8"
          className="fill-primary/8"
        />
        {/* Handle */}
        <path
          d="M130 105 L150 125"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-primary"
        />
        {/* Handle accent */}
        <path
          d="M132 107 L148 123"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-primary/60"
        />
      </g>

      {/* X mark inside magnifying glass */}
      <g className="stroke-foreground/20">
        <path
          d="M100 75 L120 95"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M120 75 L100 95"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      {/* Floating circles */}
      <circle
        cx="165"
        cy="100"
        r="5"
        className={cn("fill-primary/10", animated && "animate-drift")}
      />
      <circle
        cx="25"
        cy="90"
        r="6"
        className={cn("fill-primary/8", animated && "animate-float-gentle")}
      />
    </svg>
  );
}
