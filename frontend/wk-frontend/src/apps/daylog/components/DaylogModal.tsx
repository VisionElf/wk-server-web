import { useEffect, useState } from "react";

import {
  createDaylogEvent,
  deleteDaylogEvent,
  updateDaylogEvent,
} from "../api/daylogEvents";
import { fetchDaylogEventTypes, type DaylogEventTypeDto } from "../api/daylogEventTypes";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "../utils/datetimeLocal";

export type DaylogModalDraft = {
  mode: "create" | "edit";
  id?: string;
  eventType: string;
  start: Date;
  end: Date | null;
  customText: string;
};

export function DaylogModal({
  draft,
  isOpen,
  onClose,
  onSaved,
}: {
  draft: DaylogModalDraft | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [types, setTypes] = useState<DaylogEventTypeDto[] | null>(null);
  const [eventType, setEventType] = useState("");
  const [customText, setCustomText] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void fetchDaylogEventTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !draft) {
      return;
    }
    setEventType(draft.eventType);
    setCustomText(draft.customText);
    setStartLocal(toDatetimeLocalValue(draft.start));
    setEndLocal(draft.end ? toDatetimeLocalValue(draft.end) : "");
    setError(null);
  }, [isOpen, draft]);

  useEffect(() => {
    if (!isOpen || !types?.length) {
      return;
    }
    setEventType((prev) => (types.some((t) => t.code === prev) ? prev : types[0].code));
  }, [isOpen, types]);

  if (!isOpen || !draft) {
    return null;
  }

  const title = draft.mode === "edit" ? "Edit event" : "New event";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const current = draft;
    if (!current) {
      return;
    }

    setError(null);

    if (!types?.length) {
      setError("No event types are configured. Add types in Daylog → Event types.");
      return;
    }

    const start = fromDatetimeLocalValue(startLocal);
    let end: Date | null = null;
    if (endLocal.trim() !== "") {
      end = fromDatetimeLocalValue(endLocal);
      if (end < start) {
        setError("End time must be on or after start time.");
        return;
      }
    }

    const payload = {
      eventType,
      startUtc: start,
      endUtc: end,
      customText: customText.trim() === "" ? null : customText.trim(),
    };

    setBusy(true);
    try {
      if (current.mode === "create") {
        await createDaylogEvent(payload);
      } else if (current.id) {
        await updateDaylogEvent(current.id, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const current = draft;
    if (!current || current.mode !== "edit" || !current.id) {
      return;
    }
    if (!window.confirm("Delete this event?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteDaylogEvent(current.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onMouseDown={busy ? undefined : onClose}
    >
      <div
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daylog-modal-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="daylog-modal-title">{title}</h2>

        <form onSubmit={handleSubmit} className="daylog-modal__form">
          <label className="daylog-modal__field">
            <span>Type</span>
            <select
              value={eventType}
              onChange={(ev) => setEventType(ev.target.value)}
              disabled={busy || types === null}
            >
              {types === null && <option value="">Loading…</option>}
              {types?.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="daylog-modal__field">
            <span>Details</span>
            <textarea
              value={customText}
              onChange={(ev) => setCustomText(ev.target.value)}
              rows={3}
              placeholder="Description, notes, title…"
              disabled={busy}
            />
          </label>

          <label className="daylog-modal__field">
            <span>Start</span>
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(ev) => setStartLocal(ev.target.value)}
              required
              disabled={busy}
            />
          </label>

          <label className="daylog-modal__field">
            <span>End (optional)</span>
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(ev) => setEndLocal(ev.target.value)}
              disabled={busy}
            />
          </label>

          {error != null && <p className="daylog-modal__error">{error}</p>}

          <div className="ui-btn-group ui-modal__actions">
            {draft.mode === "edit" && (
              <button type="button" className="ui-btn" onClick={handleDelete} disabled={busy}>
                Delete
              </button>
            )}
            <button type="button" className="ui-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ui-btn ui-btn--primary" disabled={busy}>
              {draft.mode === "edit" ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
