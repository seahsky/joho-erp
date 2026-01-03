"use client";

import { cn } from "../../lib/utils";

interface EmptyCartIllustrationProps {
  className?: string;
  animated?: boolean;
  intensity?: "subtle" | "moderate" | "vibrant";
}

export function EmptyCartIllustration({
  className,
  animated = true,
  intensity = "moderate",
}: EmptyCartIllustrationProps) {
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
        cy="135"
        rx="55"
        ry="10"
        className="fill-foreground/5"
      />

      {/* Floating decoration 1 - circle */}
      <circle
        cx="40"
        cy="35"
        r="10"
        className={cn("fill-primary/15", animated && "animate-float-gentle")}
      />

      {/* Floating decoration 2 - smaller circle */}
      <circle
        cx="165"
        cy="50"
        r="7"
        className={cn("fill-primary/10", animated && "animate-float-secondary")}
      />

      {/* Floating decoration 3 - price tag */}
      <g className={cn(animated && "animate-drift")}>
        <rect
          x="155"
          y="85"
          width="24"
          height="16"
          rx="3"
          className="fill-primary/10"
        />
        <circle cx="159" cy="89" r="2" className="fill-primary/20" />
        <line
          x1="165"
          y1="93"
          x2="175"
          y2="93"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-primary/25"
        />
      </g>

      {/* Main cart illustration */}
      <g>
        {/* Cart body */}
        <path
          d="M55 55 L70 55 L82 105 L138 105 L150 65 L78 65"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-foreground/25 fill-none"
        />

        {/* Cart handle */}
        <path
          d="M45 55 L55 55"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="stroke-primary"
        />

        {/* Cart basket interior - dashed to show emptiness */}
        <rect
          x="85"
          y="72"
          width="45"
          height="26"
          rx="4"
          strokeDasharray="5 3"
          strokeWidth="1.5"
          className="stroke-foreground/15 fill-primary/3"
        />

        {/* Cart wheels */}
        <circle
          cx="92"
          cy="118"
          r="9"
          strokeWidth="3"
          className="stroke-foreground/20 fill-background"
        />
        <circle cx="92" cy="118" r="3" className="fill-foreground/15" />

        <circle
          cx="132"
          cy="118"
          r="9"
          strokeWidth="3"
          className="stroke-foreground/20 fill-background"
        />
        <circle cx="132" cy="118" r="3" className="fill-foreground/15" />
      </g>

      {/* Floating small circles - additional decoration */}
      <circle
        cx="30"
        cy="75"
        r="5"
        className={cn("fill-primary/8", animated && "animate-float-secondary")}
      />

      <circle
        cx="175"
        cy="115"
        r="4"
        className={cn("fill-primary/10", animated && "animate-float-gentle")}
      />
    </svg>
  );
}
