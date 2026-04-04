import { useCallback, useEffect, useState } from "react";
import {
  addLtiEvent,
  clearLtiHistory,
  createLtiItem,
  deleteLtiItem,
  type LtiItem,
} from "../api/client";

type Mode = "add" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  item: LtiItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ItemEditorModal({ open, mode, item, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setShowCustom(false);
    setCustomDate("");
    if (mode === "edit" && item) {
      setName(item.name);
    } else {
      setName("");
    }
  }, [open, mode, item]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const onMarkNow = () => {
    void run(async () => {
      if (mode === "add") {
        if (!name.trim()) {
          throw new Error("Enter a name.");
        }
        const created = await createLtiItem(name.trim());
        await addLtiEvent(created.id);
        return;
      }
      if (!item) {
        return;
      }
      await addLtiEvent(item.id);
    });
  };

  const onSaveCustom = () => {
    void run(async () => {
      if (!customDate) {
        throw new Error("Pick a date.");
      }
      const occurredAt = new Date(`${customDate}T12:00:00.000Z`).toISOString();
      if (mode === "add") {
        if (!name.trim()) {
          throw new Error("Enter a name.");
        }
        const created = await createLtiItem(name.trim());
        await addLtiEvent(created.id, occurredAt);
        return;
      }
      if (!item) {
        return;
      }
      await addLtiEvent(item.id, occurredAt);
    });
  };

  const onClearHistory = () => {
    if (!item || !confirm(`Clear all history for "${item.name}"?`)) {
      return;
    }
    void run(async () => {
      await clearLtiHistory(item.id);
    });
  };

  const onDelete = () => {
    if (!item || !confirm(`Delete "${item.name}"?`)) {
      return;
    }
    void run(async () => {
      await deleteLtiItem(item.id);
    });
  };

  if (!open) {
    return null;
  }

  const hasHistory = (item?.historyCount ?? 0) > 0;
  const showNameField = mode === "add";

  return (
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onMouseDown={handleBackdrop}
    >
      <div
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lti-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="lti-modal-title">
          {mode === "add" ? "Add item" : item?.name ?? "Item"}
        </h2>

        {mode === "edit" && item?.lastChangedAtUtc != null && (
          <p className="ui-lead">
            Last changed:{" "}
            {new Date(item.lastChangedAtUtc).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {error != null && <p className="ui-error">{error}</p>}

        {showCustom ? (
          <div className="ui-field">
            <label htmlFor="lti-custom-date">Date</label>
            <input
              id="lti-custom-date"
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <div className="ui-modal__row">
              <button
                type="button"
                className="ui-btn"
                onClick={() => setShowCustom(false)}
                disabled={busy}
                title="Return to the main actions without applying this date."
              >
                Back
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => void onSaveCustom()}
                disabled={busy}
                title="Use this date as the last change time and close."
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {showNameField && (
              <div className="ui-field">
                <label htmlFor="lti-name">Name</label>
                <input
                  id="lti-name"
                  type="text"
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kitchen Sponge"
                  disabled={busy}
                />
              </div>
            )}

            <div className="ui-modal__actions">
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => void onMarkNow()}
                disabled={busy}
                title={
                  mode === "add"
                    ? "Create the item and record a change at the current time."
                    : "Record a new change at the current time."
                }
              >
                {mode === "add" ? "Create & mark now" : "Mark as changed now"}
              </button>
              <button
                type="button"
                className="ui-btn"
                onClick={() => setShowCustom(true)}
                disabled={busy}
                title="Pick a specific date instead of “now”."
              >
                Set custom date…
              </button>
              {mode === "edit" && hasHistory && (
                <button
                  type="button"
                  className="ui-btn ui-btn--danger"
                  onClick={() => void onClearHistory()}
                  disabled={busy}
                  title="Remove all past events for this item (the item stays)."
                >
                  Clear history
                </button>
              )}
              {mode === "edit" && item?.lastChangedAtUtc != null && (
                <button
                  type="button"
                  className="ui-btn ui-btn--danger"
                  onClick={() => void onDelete()}
                  disabled={busy}
                  title="Delete this item and its entire history."
                >
                  Delete item
                </button>
              )}
            </div>
            <div className="ui-modal__row">
              <button
                type="button"
                className="ui-btn"
                onClick={onClose}
                disabled={busy}
                title="Close the dialog without saving."
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
