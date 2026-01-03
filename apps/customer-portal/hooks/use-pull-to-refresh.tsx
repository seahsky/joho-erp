'use client';

import * as React from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  maxPull?: number;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  indicatorRef: React.RefObject<HTMLDivElement | null>;
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  maxPull = 150,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const indicatorRef = React.useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPulling, setIsPulling] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const startY = React.useRef(0);
  const currentY = React.useRef(0);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when scrolled to top
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only allow pulling down
    if (diff < 0) {
      setPullDistance(0);
      return;
    }

    // Apply resistance and cap the pull distance
    const resistedDiff = Math.min(diff / resistance, maxPull);
    setPullDistance(resistedDiff);

    // Prevent default scroll when pulling
    if (diff > 0 && container.scrollTop === 0) {
      e.preventDefault();
    }
  }, [isPulling, isRefreshing, resistance, maxPull]);

  const handleTouchEnd = React.useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(threshold / 2); // Hold at refresh position

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Release without refresh - animate back
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    containerRef,
    indicatorRef,
    pullDistance,
    isPulling,
    isRefreshing,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Component for rendering the pull-to-refresh indicator
export function PullToRefreshIndicator({
  pullDistance,
  threshold,
  isRefreshing,
}: {
  pullDistance: number;
  threshold: number;
  isRefreshing: boolean;
}) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center transition-all duration-200 ease-out overflow-hidden"
      style={{
        height: pullDistance,
        opacity: progress,
      }}
    >
      <div
        className={`
          w-8 h-8 rounded-full border-2 border-primary border-t-transparent
          ${isRefreshing ? 'animate-spin' : ''}
        `}
        style={{
          transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
        }}
      />
    </div>
  );
}
