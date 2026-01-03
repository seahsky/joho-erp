"use client";

import * as React from "react";
import { m, Variants } from "framer-motion";

interface StaggeredListProps {
  children: React.ReactNode;
  /** Delay between each child animation in seconds */
  staggerDelay?: number;
  /** Initial delay before animations start in seconds */
  initialDelay?: number;
  /** Animation duration for each child in seconds */
  duration?: number;
  /** Custom class name for the container */
  className?: string;
}

const defaultItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

/**
 * StaggeredList wraps children in Framer Motion animation that
 * reveals each child sequentially with a staggered delay.
 *
 * Ideal for:
 * - Skeleton loading lists
 * - Product grid reveals
 * - Order list animations
 * - Any list that should animate in sequentially
 *
 * @example
 * ```tsx
 * <StaggeredList>
 *   {items.map(item => (
 *     <Skeleton key={item.id} className="h-20 w-full" />
 *   ))}
 * </StaggeredList>
 * ```
 */
export function StaggeredList({
  children,
  staggerDelay = 0.05,
  initialDelay = 0,
  duration = 0.3,
  className,
}: StaggeredListProps) {
  const customContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  const customItemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: "easeOut",
      },
    },
  };

  return (
    <m.div
      variants={customContainerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <m.div key={index} variants={customItemVariants}>
          {child}
        </m.div>
      ))}
    </m.div>
  );
}

/**
 * StaggeredItem can be used standalone for more granular control
 * over which elements should animate as part of a stagger sequence.
 */
export function StaggeredItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <m.div variants={defaultItemVariants} className={className}>
      {children}
    </m.div>
  );
}
