/**
 * Next.js Instrumentation File
 *
 * This file runs once when the Node.js server starts.
 * Used to initialize the Agenda scheduler for background cron jobs.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not during build or in edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to avoid bundling issues with edge runtime
    const { initializeAgenda } = await import("./lib/cron/agenda");
    await initializeAgenda();
  }
}
