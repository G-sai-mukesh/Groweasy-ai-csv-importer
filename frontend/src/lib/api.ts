import type { ImportStreamEvent } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ImportRequestError extends Error {}

/**
 * Uploads the CSV file to the backend and streams back NDJSON progress events
 * as the AI processes each batch, invoking `onEvent` for every line as it
 * arrives. Resolves once the stream ends (after a "done" or "error" event).
 */
export async function streamCsvImport(file: File, onEvent: (event: ImportStreamEvent) => void): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/csv/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Import request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // response wasn't JSON; keep the generic message
    }
    throw new ImportRequestError(message);
  }

  if (!response.body) {
    throw new ImportRequestError("No response stream received from the server.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as ImportStreamEvent);
      } catch {
        // Ignore malformed lines rather than failing the whole stream.
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    try {
      onEvent(JSON.parse(trailing) as ImportStreamEvent);
    } catch {
      // ignore trailing partial line
    }
  }
}
