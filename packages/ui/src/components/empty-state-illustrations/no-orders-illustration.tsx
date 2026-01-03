"use client";

import { cn } from "../../lib/utils";

interface NoOrdersIllustrationProps {
  className?: string;
  animated?: boolean;
  intensity?: "subtle" | "moderate" | "vibrant";
}

export function NoOrdersIllustration({
  className,
  animated = true,
  intensity = "moderate",
}: NoOrdersIllustrationProps) {
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
        cy="140"
        rx="45"
        ry="8"
        className="fill-foreground/5"
      />

      {/* Floating calendar icon */}
      <g className={cn(animated && "animate-float-gentle")}>
        <rect
          x="25"
          y="30"
          width="22"
          height="20"
          rx="3"
          className="fill-primary/12 stroke-primary/25"
          strokeWidth="1.5"
        />
        <line
          x1="29"
          y1="30"
          x2="29"
          y2="26"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-primary/30"
        />
        <line
          x1="43"
          y1="30"
          x2="43"
          y2="26"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-primary/30"
        />
        <line
          x1="27"
          y1="38"
          x2="45"
          y2="38"
          strokeWidth="1"
          className="stroke-primary/20"
        />
      </g>

      {/* Floating checkmark */}
      <g className={cn(animated && "animate-float-secondary")}>
        <circle cx="165" cy="45" r="10" className="fill-primary/10" />
        <path
          d="M160 45 L164 49 L172 41"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary/40"
        />
      </g>

      {/* Main document/clipboard */}
      <g>
        {/* Document background */}
        <rect
          x="60"
          y="35"
          width="80"
          height="100"
          rx="6"
          className="fill-background stroke-foreground/20"
          strokeWidth="2"
        />

        {/* Document header */}
        <rect
          x="60"
          y="35"
          width="80"
          height="20"
          rx="6"
          className="fill-primary/8"
        />
        <rect
          x="60"
          y="48"
          width="80"
          height="7"
          className="fill-primary/8"
        />

        {/* Clipboard clip */}
        <rect
          x="85"
          y="28"
          width="30"
          height="14"
          rx="3"
          className="fill-foreground/15 stroke-foreground/25"
          strokeWidth="1.5"
        />
        <circle cx="100" cy="35" r="3" className="fill-background" />

        {/* Document lines (empty content) */}
        <g className="stroke-foreground/10">
          <line x1="72" y1="70" x2="128" y2="70" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
          <line x1="72" y1="82" x2="115" y2="82" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
          <line x1="72" y1="94" x2="120" y2="94" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
          <line x1="72" y1="106" x2="100" y2="106" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
        </g>

        {/* Empty checkbox placeholders */}
        <g className="stroke-foreground/15 fill-none">
          <rect x="72" y="116" width="10" height="10" rx="2" strokeWidth="1.5" strokeDasharray="2 1" />
          <rect x="88" y="116" width="10" height="10" rx="2" strokeWidth="1.5" strokeDasharray="2 1" />
          <rect x="104" y="116" width="10" height="10" rx="2" strokeWidth="1.5" strokeDasharray="2 1" />
        </g>
      </g>

      {/* Floating decorations */}
      <circle
        cx="35"
        cy="100"
        r="5"
        className={cn("fill-primary/8", animated && "animate-drift")}
      />
      <circle
        cx="170"
        cy="110"
        r="4"
        className={cn("fill-primary/10", animated && "animate-float-gentle")}
      />

      {/* Small boxes floating */}
      <rect
        x="155"
        y="80"
        width="12"
        height="12"
        rx="2"
        className={cn("fill-primary/8", animated && "animate-float-secondary")}
      />
    </svg>
  );
}
