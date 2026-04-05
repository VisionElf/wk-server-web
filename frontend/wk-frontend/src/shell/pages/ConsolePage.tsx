import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchServerLogs } from "@/core/serverLogsApi";
import "../shell.css";

const pollMs = 1200;
/** If the user is within this many px of the bottom, treat as "following" new lines. */
const stickToBottomThresholdPx = 12;

/** Primary log line shape from ServerLogBufferLoggerProvider: `yyyy-MM-dd HH:mm:ss.fffZ [Level] Category: message` */
const primaryLogLineRe =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d{3})Z (\[[^\]]+\]) ([^:]+): (.*)$/;

function compactServerLogLine(line: string): string {
  const m = line.match(primaryLogLineRe);
  if (m == null) {
    return line;
  }
  const [, , timeWithMs, levelBracket, category, message] = m;
  const shortCategory = category.includes(".")
    ? category.slice(category.lastIndexOf(".") + 1)
    : category;
  return `${timeWithMs}Z ${levelBracket} ${shortCategory}: ${message}`;
}

function formatConsoleText(raw: string, compacted: boolean): string {
  if (!compacted || raw.length === 0) {
    return raw;
  }
  return raw
    .split("\n")
    .map((line) => compactServerLogLine(line))
    .join("\n");
}

type ScrollIntent = "stick-bottom" | "preserve";

export default function ConsolePage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [compact, setCompact] = useState(true);
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
  }, [text, compact]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load]);

  const displayText = useMemo(
    () => formatConsoleText(text, compact),
    [text, compact],
  );

  return (
    <div className="app-page ui-page--constrained console-page">
      <div className="ui-page-header">
        <div className="ui-page-header__intro">
          <h1>Console</h1>
          <p className="ui-lead">
            Server log buffer (Information+; verbose Microsoft.* below Warning is
            filtered, except HTTP request lines). Scroll position is kept unless you
            are at the bottom (then it follows new lines). Updates about every{" "}
            {pollMs / 1000}s.
          </p>
        </div>
        <div className="ui-page-actions">
          <label
            className="ui-switch"
            title="Shorter timestamps (time only) and logger name without namespace."
          >
            <span className="ui-switch__track">
              <input
                className="ui-switch__input"
                type="checkbox"
                checked={compact}
                onChange={(e) => {
                  const el = taRef.current;
                  if (el != null) {
                    scrollIntentRef.current = {
                      intent: "preserve",
                      scrollTop: el.scrollTop,
                    };
                  }
                  setCompact(e.target.checked);
                }}
              />
              <span className="ui-switch__slider" aria-hidden />
            </span>
            <span className="ui-switch__label">Compact</span>
          </label>
          <label
            className="ui-switch"
            title="When on, stop polling the server for new log lines (current text stays)."
          >
            <span className="ui-switch__track">
              <input
                className="ui-switch__input"
                type="checkbox"
                checked={paused}
                onChange={(e) => setPaused(e.target.checked)}
              />
              <span className="ui-switch__slider" aria-hidden />
            </span>
            <span className="ui-switch__label">Pause</span>
          </label>
        </div>
      </div>
      {error != null && <p className="ui-error">{error}</p>}
      <textarea
        ref={taRef}
        className="console-page__out"
        readOnly
        spellCheck={false}
        aria-label="Server logs"
        value={displayText}
      />
    </div>
  );
}
