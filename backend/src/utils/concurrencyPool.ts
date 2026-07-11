/**
 * Runs `tasks` with at most `limit` running concurrently, invoking `onSettled`
 * as each one finishes (not necessarily in order). Used to parallelize AI batch
 * calls without overwhelming the provider's rate limits.
 */
export async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  onSettled: (result: { index: number; value?: T; error?: unknown }) => void
): Promise<void> {
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const index = cursor++;
      try {
        const value = await tasks[index]();
        onSettled({ index, value });
      } catch (error) {
        onSettled({ index, error });
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
}
