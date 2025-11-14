'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useLockBodyScroll } from '../../hooks';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  snapPoints?: number[]; // Array of percentages [0.25, 0.5, 0.9]
  defaultSnap?: number; // Index of default snap point
}

export function BottomSheet({
  open,
  onClose,
  children,
  className,
  snapPoints = [0.5, 0.9],
  defaultSnap = 0,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState(defaultSnap);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);

  const snapHeight = snapPoints[currentSnap] * 100;

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const dragDistance = currentY - startY;
    const threshold = 100; // px

    // Dragged down significantly = close
    if (dragDistance > threshold) {
      onClose();
    }
    // Dragged down a bit = go to smaller snap
    else if (dragDistance > 50 && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(currentSnap + 1);
    }
    // Dragged up = go to larger snap
    else if (dragDistance < -50 && currentSnap > 0) {
      setCurrentSnap(currentSnap - 1);
    }

    setStartY(0);
    setCurrentY(0);
  };

  if (!open) return null;

  const translateY = isDragging ? Math.max(0, currentY - startY) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50',
          'bg-background',
          'rounded-t-2xl',
          'shadow-lg',
          'transform transition-transform duration-300 ease-out',
          isDragging ? 'transition-none' : '',
          className
        )}
        style={{
          height: `${snapHeight}vh`,
          transform: `translateY(${translateY}px)`,
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Content */}
        <div className="h-[calc(100%-40px)] overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </div>
    </>
  );
}

BottomSheet.displayName = 'BottomSheet';
