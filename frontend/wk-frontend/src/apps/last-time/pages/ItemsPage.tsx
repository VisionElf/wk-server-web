import { useCallback, useEffect, useState } from "react";
import { addLtiEvent, fetchLtiItems, type LtiItem } from "../api/client";
import { ItemEditorModal } from "../components/ItemEditorModal";
import { formatDateLong, formatElapsed } from "../utils/formatElapsed";

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
    return <div className="ui-loading">Loading items…</div>;
  }

  return (
    <div className="app-page ui-page--constrained">
      <div className="ui-page-header">
        <div className="ui-page-header__intro">
          <h1>Last time I changed</h1>
          <p className="ui-lead">
            Track linens, sponges, and anything you replace on a schedule.
          </p>
        </div>
        <div className="ui-page-actions">
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={openAdd}
            title="Create a new tracked item (opens the editor)."
          >
            Add item
          </button>
        </div>
      </div>

      {loadError != null && <p className="ui-error">{loadError}</p>}

      <div className="ui-grid-cards">
        {items.map((item) => (
          <article
            key={item.id}
            className="ui-card ui-card--interactive"
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
            <h2 className="ui-card__title">{item.name}</h2>
            <p className="ui-card__line">
              {formatElapsed(item.lastChangedAtUtc)}
            </p>
            {item.lastChangedAtUtc != null && (
              <>
                <p className="ui-card__detail">
                  {formatDateLong(item.lastChangedAtUtc)}
                </p>
                {item.historyCount > 0 && (
                  <p className="ui-card__meta">
                    {item.historyCount}{" "}
                    {item.historyCount === 1 ? "entry" : "entries"} in history
                  </p>
                )}
              </>
            )}
            <div className="ui-card__footer">
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={(e) => void markNow(e, item)}
                title={`Record a change for ${item.name} now (adds a timestamp).`}
              >
                Mark now
              </button>
            </div>
          </article>
        ))}
      </div>

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
