import { useCallback, useEffect, useRef, useState } from "react";
import { fetchServerLogs } from "../../core/serverLogsApi";
import "../shell.css";

const pollMs = 1200;

export default function ConsolePage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (paused) {
      return;
    }
    try {
      setError(null);
      const { lines } = await fetchServerLogs();
      setText((lines ?? []).join("\n"));
      const el = taRef.current;
      if (el != null) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    }
  }, [paused]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className="app-page ui-page--constrained console-page">
      <div className="ui-page-header">
        <div>
          <h1>Console</h1>
          <p className="ui-lead">
            Server log buffer (Information+; verbose Microsoft.* below Warning is
            filtered). Updates about every {pollMs / 1000}s.
          </p>
        </div>
        <label className="console-page__pause">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />
          Pause
        </label>
      </div>
      {error != null && <p className="ui-error">{error}</p>}
      <textarea
        ref={taRef}
        className="console-page__out"
        readOnly
        spellCheck={false}
        aria-label="Server logs"
        value={text}
      />
    </div>
  );
}
