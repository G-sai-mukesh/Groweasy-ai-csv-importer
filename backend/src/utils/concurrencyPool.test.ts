import { describe, it, expect } from "vitest";
import { runWithConcurrencyLimit } from "./concurrencyPool";

describe("runWithConcurrencyLimit", () => {
  it("runs every task exactly once and reports its result", async () => {
    const tasks = [1, 2, 3, 4, 5].map((n) => () => Promise.resolve(n * 10));
    const results: Array<{ index: number; value?: number; error?: unknown }> = [];

    await runWithConcurrencyLimit(tasks, 2, (r) => results.push(r));

    expect(results).toHaveLength(5);
    const byIndex = new Map(results.map((r) => [r.index, r.value]));
    expect(byIndex.get(0)).toBe(10);
    expect(byIndex.get(4)).toBe(50);
  });

  it("never runs more than `limit` tasks concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 8 }, () => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return true;
    });

    await runWithConcurrencyLimit(tasks, 3, () => {});

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("reports a per-task error without aborting the remaining tasks", async () => {
    const tasks = [
      () => Promise.resolve("ok-1"),
      () => Promise.reject(new Error("boom")),
      () => Promise.resolve("ok-2"),
    ];
    const results: Array<{ index: number; value?: string; error?: unknown }> = [];

    await runWithConcurrencyLimit(tasks, 2, (r) => results.push(r));

    expect(results).toHaveLength(3);
    const failed = results.find((r) => r.index === 1);
    expect(failed?.error).toBeInstanceOf(Error);
    expect(results.find((r) => r.index === 0)?.value).toBe("ok-1");
    expect(results.find((r) => r.index === 2)?.value).toBe("ok-2");
  });
});
