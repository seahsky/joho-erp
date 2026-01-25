/**
 * Packing Session Management Service
 *
 * Manages packing sessions with 30-minute inactivity timeout.
 * When a packer opens the packing interface, a session is created.
 * If the session is inactive for 30 minutes, orders are reverted to 'confirmed' status.
 */

import { prisma } from "@joho-erp/database";

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export interface PackingSessionInfo {
  sessionId: string;
  packerId: string;
  deliveryDate: Date;
  orderIds: string[];
  startedAt: Date;
  lastActivityAt: Date;
  isTimedOut: boolean;
}

/**
 * Information about a packing conflict when another packer is working on the same orders.
 * Issue #7 fix: Return conflict info instead of auto-cancelling sessions.
 */
export interface PackingConflict {
  existingPackerId: string;
  existingPackerName?: string;
  existingSessionId: string;
  conflictingOrderIds: string[];
  lastActivityAt: Date;
  progressInfo: {
    orderNumber: string;
    packedItemCount: number;
  }[];
}

/**
 * Result of attempting to start a packing session.
 * Either succeeds with session info, or returns conflict info for takeover confirmation.
 */
export interface StartPackingSessionResult {
  success: boolean;
  session?: PackingSessionInfo;
  conflict?: PackingConflict;
}

/**
 * Start or resume a packing session for a packer on a specific delivery date.
 * If an active session exists for this packer and date, resume it.
 *
 * Issue #7 fix: If another packer has an active session with overlapping orders,
 * returns conflict info instead of auto-cancelling. Use takeoverPackingSession()
 * for explicit takeover with user confirmation.
 */
export async function startPackingSession(
  packerId: string,
  deliveryDate: Date,
  orderIds: string[]
): Promise<StartPackingSessionResult> {
  const startOfDay = new Date(deliveryDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(deliveryDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Check for existing active session for this packer and date
  const existingSession = await prisma.packingSession.findFirst({
    where: {
      packerId,
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: "active",
    },
  });

  if (existingSession) {
    // Update activity timestamp and order list
    const updatedSession = await prisma.packingSession.update({
      where: { id: existingSession.id },
      data: {
        lastActivityAt: new Date(),
        orderIds: [...new Set([...existingSession.orderIds, ...orderIds])],
      },
    });

    return {
      success: true,
      session: {
        sessionId: updatedSession.id,
        packerId: updatedSession.packerId,
        deliveryDate: updatedSession.deliveryDate,
        orderIds: updatedSession.orderIds,
        startedAt: updatedSession.startedAt,
        lastActivityAt: updatedSession.lastActivityAt,
        isTimedOut: false,
      },
    };
  }

  // Check for OTHER packers' active sessions that overlap with the requested orders
  const otherActiveSessions = await prisma.packingSession.findMany({
    where: {
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: "active",
      packerId: { not: packerId },
    },
  });

  // Check for order-level conflicts
  for (const otherSession of otherActiveSessions) {
    const conflictingOrderIds = orderIds.filter((id) =>
      otherSession.orderIds.includes(id)
    );

    if (conflictingOrderIds.length > 0) {
      // Get progress info for conflicting orders
      const ordersWithProgress = await prisma.order.findMany({
        where: {
          id: { in: conflictingOrderIds },
          status: "packing",
        },
        select: {
          id: true,
          orderNumber: true,
          packing: true,
        },
      });

      const progressInfo = ordersWithProgress.map((order) => ({
        orderNumber: order.orderNumber,
        packedItemCount: order.packing?.packedItems?.length ?? 0,
      }));

      // Return conflict instead of auto-cancelling
      return {
        success: false,
        conflict: {
          existingPackerId: otherSession.packerId,
          existingSessionId: otherSession.id,
          conflictingOrderIds,
          lastActivityAt: otherSession.lastActivityAt,
          progressInfo,
        },
      };
    }
  }

  // No conflicts - create new session
  const newSession = await prisma.packingSession.create({
    data: {
      packerId,
      deliveryDate: startOfDay,
      orderIds,
      status: "active",
      startedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  return {
    success: true,
    session: {
      sessionId: newSession.id,
      packerId: newSession.packerId,
      deliveryDate: newSession.deliveryDate,
      orderIds: newSession.orderIds,
      startedAt: newSession.startedAt,
      lastActivityAt: newSession.lastActivityAt,
      isTimedOut: false,
    },
  };
}

/**
 * Take over packing for orders from another packer's session.
 * Called after user confirms takeover from conflict dialog.
 *
 * Preserves progress: orders with packed items keep their progress.
 */
export async function takeoverPackingSession(
  newPackerId: string,
  existingSessionId: string,
  orderIdsToTakeover: string[]
): Promise<PackingSessionInfo> {
  // Get the existing session
  const existingSession = await prisma.packingSession.findUnique({
    where: { id: existingSessionId },
  });

  if (!existingSession) {
    throw new Error("Session not found");
  }

  // Remove taken-over orders from the old session
  const remainingOrders = existingSession.orderIds.filter(
    (id) => !orderIdsToTakeover.includes(id)
  );

  if (remainingOrders.length === 0) {
    // Cancel the old session entirely
    await prisma.packingSession.update({
      where: { id: existingSessionId },
      data: {
        status: "cancelled",
        endedAt: new Date(),
        endReason: "new_session_started", // Takeover by another packer
      },
    });
  } else {
    // Update old session to remove taken-over orders
    await prisma.packingSession.update({
      where: { id: existingSessionId },
      data: {
        orderIds: remainingOrders,
      },
    });
  }

  // Update orders to record the takeover (preserve progress)
  await prisma.order.updateMany({
    where: {
      id: { in: orderIdsToTakeover },
      status: "packing",
    },
    data: {
      // Note: Can't push to statusHistory in updateMany, handled separately if needed
    },
  });

  // Check for existing session for the new packer
  const startOfDay = new Date(existingSession.deliveryDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(existingSession.deliveryDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const newPackerSession = await prisma.packingSession.findFirst({
    where: {
      packerId: newPackerId,
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: "active",
    },
  });

  if (newPackerSession) {
    // Add to existing session
    const updatedSession = await prisma.packingSession.update({
      where: { id: newPackerSession.id },
      data: {
        lastActivityAt: new Date(),
        orderIds: [...new Set([...newPackerSession.orderIds, ...orderIdsToTakeover])],
      },
    });

    return {
      sessionId: updatedSession.id,
      packerId: updatedSession.packerId,
      deliveryDate: updatedSession.deliveryDate,
      orderIds: updatedSession.orderIds,
      startedAt: updatedSession.startedAt,
      lastActivityAt: updatedSession.lastActivityAt,
      isTimedOut: false,
    };
  }

  // Create new session for the new packer
  const newSession = await prisma.packingSession.create({
    data: {
      packerId: newPackerId,
      deliveryDate: existingSession.deliveryDate,
      orderIds: orderIdsToTakeover,
      status: "active",
      startedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  return {
    sessionId: newSession.id,
    packerId: newSession.packerId,
    deliveryDate: newSession.deliveryDate,
    orderIds: newSession.orderIds,
    startedAt: newSession.startedAt,
    lastActivityAt: newSession.lastActivityAt,
    isTimedOut: false,
  };
}

/**
 * Update session activity timestamp.
 * Called when packer performs any action (marks item, adds notes, etc.)
 */
export async function updateSessionActivity(
  sessionId: string
): Promise<void> {
  await prisma.packingSession.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });
}

/**
 * Update session activity by packer ID and delivery date.
 * More convenient when we don't have the session ID.
 */
export async function updateSessionActivityByPacker(
  packerId: string,
  deliveryDate: Date
): Promise<void> {
  const startOfDay = new Date(deliveryDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(deliveryDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  await prisma.packingSession.updateMany({
    where: {
      packerId,
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: "active",
    },
    data: { lastActivityAt: new Date() },
  });
}

/**
 * End a packing session normally (all orders completed or manual end).
 */
export async function endPackingSession(
  sessionId: string,
  reason: "all_orders_packed" | "manual_end"
): Promise<void> {
  await prisma.packingSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
      endReason: reason,
    },
  });
}

/**
 * Find and process timed-out packing sessions.
 * Returns orders that were reverted to 'confirmed' status.
 *
 * NOTE: Orders with partial progress (packedItems.length > 0) are NOT reverted.
 * Their progress is preserved and the order stays in 'packing' status with pausedAt set.
 */
export async function processTimedOutSessions(): Promise<{
  processedSessions: number;
  revertedOrders: Array<{
    orderId: string;
    orderNumber: string;
    packerId: string;
    deliveryDate: Date;
    progressPreserved: boolean;
    packedCount?: number;
  }>;
}> {
  const timeoutThreshold = new Date(Date.now() - SESSION_TIMEOUT_MS);

  // Find all active sessions that have timed out
  const timedOutSessions = await prisma.packingSession.findMany({
    where: {
      status: "active",
      lastActivityAt: {
        lt: timeoutThreshold,
      },
    },
  });

  if (timedOutSessions.length === 0) {
    return { processedSessions: 0, revertedOrders: [] };
  }

  const revertedOrders: Array<{
    orderId: string;
    orderNumber: string;
    packerId: string;
    deliveryDate: Date;
    progressPreserved: boolean;
    packedCount?: number;
  }> = [];

  for (const session of timedOutSessions) {
    // Get orders in 'packing' status with their packing info
    const ordersInPacking = await prisma.order.findMany({
      where: {
        id: { in: session.orderIds },
        status: "packing",
      },
      select: {
        id: true,
        orderNumber: true,
        packing: true,
      },
    });

    if (ordersInPacking.length > 0) {
      // Update each order individually based on whether it has progress
      for (const order of ordersInPacking) {
        const hasProgress = (order.packing?.packedItems?.length ?? 0) > 0;

        if (hasProgress) {
          // PRESERVE PROGRESS: Keep order in 'packing' status, mark as paused
          await prisma.order.update({
            where: { id: order.id },
            data: {
              // DO NOT change status - keep as 'packing'
              statusHistory: {
                push: {
                  status: "packing",
                  changedAt: new Date(),
                  changedBy: "system",
                  changedByName: "System",
                  changedByEmail: null,
                  notes: `Packing session timed out. Progress preserved: ${order.packing?.packedItems?.length ?? 0} items packed. Previous packer: ${session.packerId}`,
                },
              },
              packing: {
                ...order.packing,
                pausedAt: new Date(),
                lastPackedBy: session.packerId,
              },
            },
          });

          revertedOrders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            packerId: session.packerId,
            deliveryDate: session.deliveryDate,
            progressPreserved: true,
            packedCount: order.packing?.packedItems?.length ?? 0,
          });
        } else {
          // NO PROGRESS: Revert to 'confirmed' as before
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "confirmed",
              statusHistory: {
                push: {
                  status: "confirmed",
                  changedAt: new Date(),
                  changedBy: "system",
                  changedByName: "System",
                  changedByEmail: null,
                  notes: `Order reverted due to packing session timeout (30 minutes of inactivity). Previous packer: ${session.packerId}`,
                },
              },
              packing: {
                packedAt: null,
                packedBy: null,
                notes: null,
                areaPackingSequence: order.packing?.areaPackingSequence ?? null,
                packedItems: [],
                lastPackedAt: null,
                lastPackedBy: null,
                pausedAt: null,
              },
            },
          });

          revertedOrders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            packerId: session.packerId,
            deliveryDate: session.deliveryDate,
            progressPreserved: false,
          });
        }
      }
    }

    // Mark session as timed out
    await prisma.packingSession.update({
      where: { id: session.id },
      data: {
        status: "timed_out",
        endedAt: new Date(),
        endReason: "timeout",
      },
    });
  }

  return {
    processedSessions: timedOutSessions.length,
    revertedOrders,
  };
}

/**
 * Get active packing session for a packer on a delivery date.
 */
export async function getActiveSession(
  packerId: string,
  deliveryDate: Date
): Promise<PackingSessionInfo | null> {
  const startOfDay = new Date(deliveryDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(deliveryDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const session = await prisma.packingSession.findFirst({
    where: {
      packerId,
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: "active",
    },
  });

  if (!session) {
    return null;
  }

  const isTimedOut =
    new Date().getTime() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS;

  return {
    sessionId: session.id,
    packerId: session.packerId,
    deliveryDate: session.deliveryDate,
    orderIds: session.orderIds,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    isTimedOut,
  };
}

/**
 * Get all active packing sessions (for monitoring/debugging).
 */
export async function getAllActiveSessions(): Promise<PackingSessionInfo[]> {
  const sessions = await prisma.packingSession.findMany({
    where: { status: "active" },
    orderBy: { lastActivityAt: "desc" },
  });

  return sessions.map((session) => ({
    sessionId: session.id,
    packerId: session.packerId,
    deliveryDate: session.deliveryDate,
    orderIds: session.orderIds,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    isTimedOut:
      new Date().getTime() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS,
  }));
}
