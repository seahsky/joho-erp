/**
 * Agenda-based Job Scheduler
 *
 * This module initializes and manages scheduled jobs using Agenda (MongoDB-backed).
 * Jobs are defined here and executed by calling internal API endpoints.
 *
 * Benefits of Agenda:
 * - Job persistence: Jobs survive server restarts
 * - Job locking: Prevents duplicate execution in multi-instance deployments
 * - Retry logic: Built-in failure handling
 * - Visibility: Jobs stored in MongoDB 'agendaJobs' collection
 */

import { Agenda, Job } from "agenda";

// Job configuration interface
interface CronJobConfig {
  name: string;
  schedule: string; // Cron expression
  endpoint: string;
  description: string;
  enabled: boolean;
}

// Define all cron jobs
const CRON_JOBS: CronJobConfig[] = [
  {
    name: "sms-reminder",
    schedule: "0 * * * *", // Every hour at minute 0
    endpoint: "/api/cron/sms-reminder",
    description: "Send SMS order reminders to customers",
    enabled: true,
  },
  {
    name: "low-stock",
    schedule: "0 * * * *", // Every hour at minute 0
    endpoint: "/api/cron/low-stock",
    description: "Check for low stock items and send alerts",
    enabled: true,
  },
  {
    name: "packing-timeout",
    schedule: "*/5 * * * *", // Every 5 minutes
    endpoint: "/api/cron/packing-timeout",
    description: "Process timed out packing sessions",
    enabled: true,
  },
];

// Singleton agenda instance
let agenda: Agenda | null = null;

// Get the base URL for internal API calls
function getBaseUrl(): string {
  const port = process.env.PORT || "3001";
  return `http://localhost:${port}`;
}

// Get the cron secret for authorization
function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}

// Execute a cron job by calling its endpoint
async function executeCronJob(job: CronJobConfig): Promise<void> {
  const baseUrl = getBaseUrl();
  const cronSecret = getCronSecret();

  console.log(
    `[Agenda] Executing: ${job.name} (${job.description})`
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authorization if CRON_SECRET is configured
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }

    const response = await fetch(`${baseUrl}${job.endpoint}`, {
      method: "GET",
      headers,
    });

    const result = await response.json();

    if (response.ok) {
      console.log(
        `[Agenda] ${job.name} completed:`,
        result.message || "Success"
      );
    } else {
      console.error(
        `[Agenda] ${job.name} failed:`,
        result.error || response.statusText
      );
      throw new Error(result.error || response.statusText);
    }
  } catch (error) {
    console.error(
      `[Agenda] ${job.name} error:`,
      error instanceof Error ? error.message : error
    );
    throw error; // Re-throw to let Agenda handle retry
  }
}

/**
 * Initialize the Agenda scheduler
 *
 * This function should be called once at server startup via instrumentation.ts
 */
export async function initializeAgenda(): Promise<void> {
  // Skip if disabled via environment variable
  if (process.env.DISABLE_INTERNAL_CRON === "true") {
    console.log("[Agenda] Internal cron disabled via DISABLE_INTERNAL_CRON");
    return;
  }

  // Skip in development if desired
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_CRON_IN_DEV !== "true"
  ) {
    console.log("[Agenda] Skipping cron initialization in development mode");
    return;
  }

  // Check for MongoDB URI
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("[Agenda] MONGODB_URI not configured, skipping initialization");
    return;
  }

  // Prevent double initialization
  if (agenda) {
    console.log("[Agenda] Already initialized, skipping");
    return;
  }

  console.log("[Agenda] Initializing scheduler...");

  try {
    // Create Agenda instance
    agenda = new Agenda({
      db: {
        address: mongoUri,
        collection: "agendaJobs",
      },
      processEvery: "30 seconds",
      defaultConcurrency: 1,
      defaultLockLifetime: 10 * 60 * 1000, // 10 minutes
    });

    // Define job handlers
    for (const job of CRON_JOBS) {
      if (!job.enabled) {
        console.log(`[Agenda] Skipping disabled job: ${job.name}`);
        continue;
      }

      agenda.define(job.name, async (_agendaJob: Job) => {
        await executeCronJob(job);
      });

      console.log(`[Agenda] Defined job: ${job.name}`);
    }

    // Wait for agenda to connect
    await agenda.start();
    console.log("[Agenda] Scheduler started");

    // Schedule jobs (upsert - only creates if not exists or schedule changed)
    for (const job of CRON_JOBS) {
      if (!job.enabled) continue;

      // Cancel any existing jobs with this name, then schedule fresh
      await agenda.cancel({ name: job.name });
      await agenda.every(job.schedule, job.name, {}, { timezone: "Australia/Sydney" });
      console.log(`[Agenda] Scheduled: ${job.name} (${job.schedule})`);
    }

    console.log("[Agenda] All jobs scheduled successfully");

    // Graceful shutdown handlers
    const gracefulShutdown = async () => {
      console.log("[Agenda] Shutting down gracefully...");
      if (agenda) {
        await agenda.stop();
        agenda = null;
      }
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    console.error(
      "[Agenda] Failed to initialize:",
      error instanceof Error ? error.message : error
    );
    agenda = null;
  }
}

/**
 * Stop the Agenda scheduler
 *
 * Use this for manual cleanup if needed
 */
export async function stopAgenda(): Promise<void> {
  if (agenda) {
    console.log("[Agenda] Stopping scheduler...");
    await agenda.stop();
    agenda = null;
    console.log("[Agenda] Scheduler stopped");
  }
}

/**
 * Get the Agenda instance (for testing/debugging)
 */
export function getAgenda(): Agenda | null {
  return agenda;
}
