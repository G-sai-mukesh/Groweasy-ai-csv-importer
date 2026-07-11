// simple worker-pool: runs `tasks` with at most `limit` in flight, calling
// onSettled as each finishes (order not guaranteed)
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
