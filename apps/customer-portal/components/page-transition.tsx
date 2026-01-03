"use client";

import { m } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  duration: 0.3,
  ease: "easeOut" as const,
};

/**
 * PageTransition provides smooth fade-in/out animations for page navigation.
 * Uses Framer Motion's m component (lazy-loaded via LazyMotion provider).
 *
 * Respects prefers-reduced-motion via CSS media query.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <m.div
      key={pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="motion-safe:animate-none"
    >
      {children}
    </m.div>
  );
}
