"use client";

import { cn } from "../../lib/utils";

interface ErrorIllustrationProps {
  className?: string;
  animated?: boolean;
  intensity?: "subtle" | "moderate" | "vibrant";
}

export function ErrorIllustration({
  className,
  animated = true,
  intensity = "moderate",
}: ErrorIllustrationProps) {
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
        rx="50"
        ry="8"
        className="fill-foreground/5"
      />

      {/* Floating question mark 1 */}
      <g className={cn(animated && "animate-float-gentle")}>
        <circle cx="35" cy="40" r="12" className="fill-primary/10" />
        <text
          x="35"
          y="46"
          textAnchor="middle"
          className="fill-primary/40"
          fontSize="16"
          fontWeight="600"
        >
          ?
        </text>
      </g>

      {/* Floating question mark 2 */}
      <g className={cn(animated && "animate-float-secondary")}>
        <circle cx="170" cy="55" r="10" className="fill-primary/8" />
        <text
          x="170"
          y="60"
          textAnchor="middle"
          className="fill-primary/35"
          fontSize="14"
          fontWeight="600"
        >
          ?
        </text>
      </g>

      {/* Main warning triangle - softened/rounded */}
      <g>
        {/* Triangle background glow */}
        <path
          d="M100 40 L145 115 L55 115 Z"
          className="fill-primary/5"
        />

        {/* Triangle main shape - rounded corners effect via stroke */}
        <path
          d="M100 48 L140 110 L60 110 Z"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary/50 fill-primary/8"
        />

        {/* Inner highlight */}
        <path
          d="M100 58 L128 100 L72 100 Z"
          className="fill-background/30"
        />

        {/* Exclamation mark */}
        <line
          x1="100"
          y1="68"
          x2="100"
          y2="85"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-primary"
        />
        <circle cx="100" cy="96" r="3" className="fill-primary" />
      </g>

      {/* Connection dots - suggesting broken connection */}
      <g className={cn(animated && "animate-drift")}>
        <circle cx="45" cy="90" r="3" className="fill-foreground/15" />
        <circle cx="55" cy="85" r="2" className="fill-foreground/10" />
        <circle cx="63" cy="82" r="1.5" className="fill-foreground/8" />
      </g>

      <g className={cn(animated && "animate-drift")}>
        <circle cx="155" cy="90" r="3" className="fill-foreground/15" />
        <circle cx="145" cy="85" r="2" className="fill-foreground/10" />
        <circle cx="137" cy="82" r="1.5" className="fill-foreground/8" />
      </g>

      {/* Floating circles */}
      <circle
        cx="25"
        cy="75"
        r="5"
        className={cn("fill-primary/8", animated && "animate-float-secondary")}
      />
      <circle
        cx="178"
        cy="105"
        r="4"
        className={cn("fill-primary/10", animated && "animate-float-gentle")}
      />

      {/* Small decorative element */}
      <rect
        x="160"
        y="120"
        width="8"
        height="8"
        rx="2"
        className={cn("fill-primary/8", animated && "animate-float-secondary")}
        transform="rotate(15 164 124)"
      />
    </svg>
  );
}
