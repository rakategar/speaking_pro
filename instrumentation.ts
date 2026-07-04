// Next.js instrumentation hook -- runs once when the server boots.
// Starts the in-process analysis queue worker (production `next start`).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorker } = await import("@/lib/queue/worker");
    startWorker();
  }
}
