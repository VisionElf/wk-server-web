import { useCallback, useEffect, useState } from "react";
import { addLtiEvent, fetchLtiItems, type LtiItem } from "@/apps/last-time/api/client";
import { ItemEditorModal } from "@/apps/last-time/components/ItemEditorModal";
import { formatDateLong, formatElapsed } from "@/apps/last-time/utils/formatElapsed";

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

      {items.length === 0 ? (
        <p className="ui-lead" style={{ marginTop: "1rem" }}>
          No items yet. Click <strong>Add item</strong> to create one.
        </p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table className="ui-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Last changed</th>
                <th scope="col">Date</th>
                <th scope="col">History</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => openEdit(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEdit(item);
                    }
                  }}
                >
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{formatElapsed(item.lastChangedAtUtc)}</td>
                  <td>
                    {item.lastChangedAtUtc != null ? formatDateLong(item.lastChangedAtUtc) : "—"}
                  </td>
                  <td>
                    {item.historyCount > 0
                      ? `${item.historyCount} ${item.historyCount === 1 ? "entry" : "entries"}`
                      : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ui-btn ui-btn--primary"
                      style={{ whiteSpace: "nowrap" }}
                      onClick={(e) => void markNow(e, item)}
                      title={`Record a change for ${item.name} now.`}
                    >
                      Mark now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
