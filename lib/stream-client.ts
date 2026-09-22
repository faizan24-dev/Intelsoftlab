// Client helper: POST JSON and consume an NDJSON response line-by-line.

export async function streamNdjson<T>(
  url: string,
  body: unknown,
  onEvent: (event: T) => void,
): Promise<void> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok || !resp.body) {
    let msg = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) onEvent(JSON.parse(line) as T);
    }
  }
  const tail = buffer.trim();
  if (tail) onEvent(JSON.parse(tail) as T);
}
