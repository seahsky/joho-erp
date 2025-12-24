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
 * Start or resume a packing session for a packer on a specific delivery date.
 * If an active session exists for this packer and date, resume it.
 * If an active session exists for another packer, end that session first.
 */
export async function startPackingSession(
  packerId: string,
  deliveryDate: Date,
  orderIds: string[]
): Promise<PackingSessionInfo> {
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
      sessionId: updatedSession.id,
      packerId: updatedSession.packerId,
      deliveryDate: updatedSession.deliveryDate,
      orderIds: updatedSession.orderIds,
      startedAt: updatedSession.startedAt,
      lastActivityAt: updatedSession.lastActivityAt,
      isTimedOut: false,
    };
  }

  // End any other active sessions for this delivery date (by other packers)
  await prisma.packingSession.updateMany({
    where: {
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: "active",
      packerId: { not: packerId },
    },
    data: {
      status: "cancelled",
      endedAt: new Date(),
      endReason: "new_session_started",
    },
  });

  // Create new session
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
 */
export async function processTimedOutSessions(): Promise<{
  processedSessions: number;
  revertedOrders: Array<{
    orderId: string;
    orderNumber: string;
    packerId: string;
    deliveryDate: Date;
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
  }> = [];

  for (const session of timedOutSessions) {
    // Revert orders in 'packing' status back to 'confirmed'
    const ordersToRevert = await prisma.order.findMany({
      where: {
        id: { in: session.orderIds },
        status: "packing",
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (ordersToRevert.length > 0) {
      // Update each order individually to maintain status history
      for (const order of ordersToRevert) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "confirmed",
            statusHistory: {
              push: {
                status: "confirmed",
                changedAt: new Date(),
                changedBy: "system",
                notes: `Order reverted due to packing session timeout (30 minutes of inactivity). Previous packer: ${session.packerId}`,
              },
            },
            // Clear packed items since packing was incomplete
            packing: {
              packedAt: null,
              packedBy: null,
              notes: null,
              packingSequence: null,
              packedItems: [],
            },
          },
        });

        revertedOrders.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          packerId: session.packerId,
          deliveryDate: session.deliveryDate,
        });
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
