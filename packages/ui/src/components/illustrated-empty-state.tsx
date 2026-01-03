"use client";

import { useMemo } from "react";
import { type LucideIcon, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "../lib/utils";
import {
  EmptyCartIllustration,
  NoProductsIllustration,
  NoOrdersIllustration,
  ErrorIllustration,
} from "./empty-state-illustrations";

export type IllustratedEmptyStateVariant =
  | "empty-cart"
  | "no-products"
  | "no-orders"
  | "error"
  | "custom";

export interface IllustratedEmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  loading?: boolean;
  loadingLabel?: string;
}

export interface IllustratedEmptyStateProps {
  variant: IllustratedEmptyStateVariant;
  title: string;
  description: string;
  secondaryDescription?: string;
  primaryAction: IllustratedEmptyStateAction;
  secondaryAction?: Omit<IllustratedEmptyStateAction, "loading" | "loadingLabel">;
  customIllustration?: React.ReactNode;
  animationsEnabled?: boolean;
  animationIntensity?: "subtle" | "moderate" | "vibrant";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "py-8 max-w-xs",
  md: "py-12 max-w-sm",
  lg: "py-16 max-w-md",
};

const illustrationSizes = {
  sm: "w-32 h-24",
  md: "w-48 h-36",
  lg: "w-64 h-48",
};

export function IllustratedEmptyState({
  variant,
  title,
  description,
  secondaryDescription,
  primaryAction,
  secondaryAction,
  customIllustration,
  animationsEnabled = true,
  animationIntensity = "moderate",
  size = "md",
  className,
}: IllustratedEmptyStateProps) {
  const Illustration = useMemo(() => {
    switch (variant) {
      case "empty-cart":
        return EmptyCartIllustration;
      case "no-products":
        return NoProductsIllustration;
      case "no-orders":
        return NoOrdersIllustration;
      case "error":
        return ErrorIllustration;
      case "custom":
        return null;
    }
  }, [variant]);

  const PrimaryIcon = primaryAction.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        sizeClasses[size],
        className
      )}
    >
      {/* Illustration container with entrance animation */}
      <div
        className={cn(
          "relative mb-6",
          animationsEnabled && "animate-fade-in-up"
        )}
      >
        {variant === "custom" && customIllustration ? (
          customIllustration
        ) : Illustration ? (
          <Illustration
            className={illustrationSizes[size]}
            animated={animationsEnabled}
            intensity={animationIntensity}
          />
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {/* Primary description */}
      <p className="text-sm text-muted-foreground max-w-sm mb-1">
        {description}
      </p>

      {/* Secondary description */}
      {secondaryDescription && (
        <p className="text-xs text-muted-foreground/70 max-w-sm mb-4">
          {secondaryDescription}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button
          variant="default"
          size="default"
          onClick={primaryAction.onClick}
          disabled={primaryAction.loading}
          className="min-w-[140px]"
        >
          {primaryAction.loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {primaryAction.loadingLabel || primaryAction.label}
            </>
          ) : (
            <>
              {PrimaryIcon && <PrimaryIcon className="h-4 w-4 mr-2" />}
              {primaryAction.label}
            </>
          )}
        </Button>

        {secondaryAction && (
          <Button
            variant="outline"
            size="default"
            onClick={secondaryAction.onClick}
          >
            {SecondaryIcon && <SecondaryIcon className="h-4 w-4 mr-2" />}
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
