import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { fetchServerLogs } from "../../core/serverLogsApi";
import "../shell.css";

const pollMs = 1200;
/** If the user is within this many px of the bottom, treat as "following" new lines. */
const stickToBottomThresholdPx = 12;

type ScrollIntent = "stick-bottom" | "preserve";

export default function ConsolePage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollIntentRef = useRef<{
    intent: ScrollIntent;
    scrollTop: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (paused) {
      return;
    }
    try {
      setError(null);
      const el = taRef.current;
      if (el != null) {
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;
        const atBottom = distanceFromBottom <= stickToBottomThresholdPx;
        scrollIntentRef.current = atBottom
          ? { intent: "stick-bottom", scrollTop: 0 }
          : { intent: "preserve", scrollTop: el.scrollTop };
      } else {
        scrollIntentRef.current = { intent: "stick-bottom", scrollTop: 0 };
      }
      const { lines } = await fetchServerLogs();
      setText((lines ?? []).join("\n"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    }
  }, [paused]);

  useLayoutEffect(() => {
    const el = taRef.current;
    const intent = scrollIntentRef.current;
    if (el == null || intent == null) {
      return;
    }
    scrollIntentRef.current = null;
    if (intent.intent === "stick-bottom") {
      el.scrollTop = el.scrollHeight - el.clientHeight;
    } else {
      el.scrollTop = Math.min(
        intent.scrollTop,
        Math.max(0, el.scrollHeight - el.clientHeight),
      );
    }
  }, [text]);

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
            filtered, except HTTP request lines). Scroll position is kept unless you
            are at the bottom (then it follows new lines). Updates about every{" "}
            {pollMs / 1000}s.
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
