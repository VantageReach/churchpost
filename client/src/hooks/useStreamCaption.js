import { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export function useStreamCaption() {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const { getToken } = useAuth();

  const stream = useCallback(
    async ({ topic, existingCaption, platform, tone, onChunk, onDone }) => {
      setError(null);
      setStreaming(true);

      // Cancel any in-flight stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/ai/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ topic, existingCaption, platform, tone }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              onDone?.();
              return;
            }
            try {
              const { text, error: streamErr } = JSON.parse(data);
              if (streamErr) throw new Error(streamErr);
              if (text) onChunk(text);
            } catch (e) {
              if (e.message !== "Unexpected end of JSON input") throw e;
            }
          }
        }
        onDone?.();
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setStreaming(false);
      }
    },
    [getToken]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { stream, cancel, streaming, error };
}
