"use client";

import { AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { PageTransition } from "./page-transition";

interface MotionProviderProps {
  children: React.ReactNode;
}

/**
 * MotionProvider wraps the app with Framer Motion's AnimatePresence
 * for page transitions and LazyMotion for reduced bundle size.
 *
 * Uses domAnimation feature bundle (~16kb) instead of full bundle (~50kb).
 * PageTransition provides fade + slide animations on route changes.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <PageTransition>{children}</PageTransition>
      </AnimatePresence>
    </LazyMotion>
  );
}
