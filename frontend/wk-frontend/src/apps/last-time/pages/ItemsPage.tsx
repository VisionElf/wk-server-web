import { useCallback, useEffect, useState } from "react";
import { addLtiEvent, fetchLtiItems, type LtiItem } from "../api/client";
import { ItemEditorModal } from "../components/ItemEditorModal";
import { formatDateLong, formatElapsed } from "../utils/formatElapsed";
import "../last-time.css";

export default function ItemsPage() {
  const [items, setItems] = useState<LtiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selected, setSelected] = useState<LtiItem | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await fetchLtiItems();
      setItems(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openAdd = () => {
    setModalMode("add");
    setSelected(null);
    setModalOpen(true);
  };

  const openEdit = (item: LtiItem) => {
    setModalMode("edit");
    setSelected(item);
    setModalOpen(true);
  };

  const markNow = async (e: React.MouseEvent, item: LtiItem) => {
    e.stopPropagation();
    try {
      await addLtiEvent(item.id);
      await refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (loading) {
    return <div className="lti-loading">Loading items…</div>;
  }

  return (
    <div className="app-page lti-page">
      <div className="lti-page__header">
        <div>
          <h1>Last time I changed</h1>
          <p className="lti-page__sub">
            Track linens, sponges, and anything you replace on a schedule.
          </p>
        </div>
      </div>

      {loadError != null && <p className="lti-error">{loadError}</p>}

      <div className="lti-grid">
        {items.map((item) => (
          <article
            key={item.id}
            className="lti-card"
            role="button"
            tabIndex={0}
            onClick={() => openEdit(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openEdit(item);
              }
            }}
          >
            <h2 className="lti-card__title">{item.name}</h2>
            <p className="lti-card__elapsed">
              {formatElapsed(item.lastChangedAtUtc)}
            </p>
            {item.lastChangedAtUtc != null && (
              <>
                <p className="lti-card__date">
                  {formatDateLong(item.lastChangedAtUtc)}
                </p>
                {item.historyCount > 0 && (
                  <p className="lti-card__meta">
                    {item.historyCount}{" "}
                    {item.historyCount === 1 ? "entry" : "entries"} in history
                  </p>
                )}
              </>
            )}
            <button
              type="button"
              className="lti-btn lti-btn--primary"
              onClick={(e) => void markNow(e, item)}
            >
              Mark now
            </button>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="lti-fab"
        aria-label="Add item"
        onClick={openAdd}
      >
        +
      </button>

      <ItemEditorModal
        open={modalOpen}
        mode={modalMode}
        item={selected}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  );
}
