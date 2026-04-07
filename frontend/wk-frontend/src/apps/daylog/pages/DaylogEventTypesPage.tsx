import { useCallback, useEffect, useState } from "react";

import "../css/daylog-calendar.css";

import {
  createDaylogEventType,
  deleteDaylogEventType,
  fetchDaylogEventTypes,
  updateDaylogEventType,
  type DaylogEventTypeDto,
} from "../api/daylogEventTypes";

const emptyCreate = {
  code: "",
  label: "",
  backgroundColor: "#333333",
  textColor: "#eeeeee",
};

function normalizeHexFromColorInput(value: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }
  return "#333333";
}

export default function DaylogEventTypesPage() {
  const [rows, setRows] = useState<DaylogEventTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    label: string;
    backgroundColor: string;
    textColor: string;
    sortOrder: number;
  } | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    const list = await fetchDaylogEventTypes();
    setRows(list);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  function startEdit(row: DaylogEventTypeDto) {
    setEditingId(row.id);
    setEditForm({
      label: row.label,
      backgroundColor: row.backgroundColor,
      textColor: row.textColor ?? "#eeeeee",
      sortOrder: row.sortOrder,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(id: string) {
    if (!editForm) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateDaylogEventType(id, {
        label: editForm.label.trim(),
        backgroundColor: normalizeHexFromColorInput(editForm.backgroundColor),
        textColor: editForm.textColor.trim() === "" ? null : normalizeHexFromColorInput(editForm.textColor),
        sortOrder: editForm.sortOrder,
      });
      cancelEdit();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: DaylogEventTypeDto) {
    if (!window.confirm(`Delete type "${row.label}" (${row.code})?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteDaylogEventType(row.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const code = createForm.code.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(code)) {
      setError("Code must start with a letter and use only lowercase letters, digits, and underscores.");
      return;
    }
    if (!createForm.label.trim()) {
      setError("Label is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createDaylogEventType({
        code,
        label: createForm.label.trim(),
        backgroundColor: normalizeHexFromColorInput(createForm.backgroundColor),
        textColor: createForm.textColor.trim() === "" ? null : normalizeHexFromColorInput(createForm.textColor),
      });
      setCreateForm(emptyCreate);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="app-page">
        <p className="ui-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-page daylog-types-page">
      <header className="ui-page-header">
        <div className="ui-page-header__intro">
          <h1>Event types</h1>
          <p className="ui-lead">
            Define labels and colors for calendar event types. The code is fixed after creation and is stored on each
            event.
          </p>
        </div>
      </header>

      {error != null && <p className="ui-error">{error}</p>}

      <section className="daylog-types-page__section">
        <h2>Add type</h2>
        <form className="daylog-types-page__form" onSubmit={handleCreate}>
          <div className="ui-field daylog-types-page__field">
            <label htmlFor="daylog-new-code">Code</label>
            <input
              id="daylog-new-code"
              className="ui-input"
              type="text"
              value={createForm.code}
              onChange={(ev) => setCreateForm((f) => ({ ...f, code: ev.target.value }))}
              placeholder="e.g. reading"
              disabled={busy}
              autoComplete="off"
            />
          </div>
          <div className="ui-field daylog-types-page__field">
            <label htmlFor="daylog-new-label">Label</label>
            <input
              id="daylog-new-label"
              className="ui-input"
              type="text"
              value={createForm.label}
              onChange={(ev) => setCreateForm((f) => ({ ...f, label: ev.target.value }))}
              placeholder="Display name"
              disabled={busy}
            />
          </div>
          <div className="ui-field daylog-types-page__field">
            <label htmlFor="daylog-new-bg">Background</label>
            <span className="ui-color-input">
              <input
                id="daylog-new-bg"
                type="color"
                value={createForm.backgroundColor}
                onChange={(ev) => setCreateForm((f) => ({ ...f, backgroundColor: ev.target.value }))}
                disabled={busy}
                aria-label="Background color"
              />
            </span>
          </div>
          <div className="ui-field daylog-types-page__field">
            <label htmlFor="daylog-new-fg">Text</label>
            <span className="ui-color-input">
              <input
                id="daylog-new-fg"
                type="color"
                value={createForm.textColor}
                onChange={(ev) => setCreateForm((f) => ({ ...f, textColor: ev.target.value }))}
                disabled={busy}
                aria-label="Text color"
              />
            </span>
          </div>
          <button type="submit" className="ui-btn ui-btn--primary daylog-types-page__submit" disabled={busy}>
            Add
          </button>
        </form>
      </section>

      <section className="daylog-types-page__section">
        <h2>Existing types</h2>
        <div className="daylog-types-page__table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Code</th>
                <th>Label</th>
                <th>Colors</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {editingId === row.id && editForm ? (
                    <>
                      <td>
                        <input
                          type="number"
                          className="ui-input daylog-types-page__input-num"
                          value={editForm.sortOrder}
                          onChange={(ev) =>
                            setEditForm((f) => (f ? { ...f, sortOrder: Number(ev.target.value) } : f))
                          }
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <code>{row.code}</code>
                      </td>
                      <td>
                        <input
                          className="ui-input"
                          type="text"
                          value={editForm.label}
                          onChange={(ev) => setEditForm((f) => (f ? { ...f, label: ev.target.value } : f))}
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <div className="daylog-types-page__color-group">
                          <span className="ui-color-input">
                            <input
                              type="color"
                              value={editForm.backgroundColor}
                              onChange={(ev) =>
                                setEditForm((f) => (f ? { ...f, backgroundColor: ev.target.value } : f))
                              }
                              disabled={busy}
                              aria-label="Background color"
                            />
                          </span>
                          <span className="ui-color-input">
                            <input
                              type="color"
                              value={editForm.textColor}
                              onChange={(ev) => setEditForm((f) => (f ? { ...f, textColor: ev.target.value } : f))}
                              disabled={busy}
                              aria-label="Text color"
                            />
                          </span>
                        </div>
                      </td>
                      <td className="daylog-types-page__actions">
                        <button type="button" className="ui-btn ui-btn--primary" onClick={() => saveEdit(row.id)} disabled={busy}>
                          Save
                        </button>
                        <button type="button" className="ui-btn" onClick={cancelEdit} disabled={busy}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{row.sortOrder}</td>
                      <td>
                        <code>{row.code}</code>
                      </td>
                      <td>{row.label}</td>
                      <td>
                        <span
                          className="daylog-types-page__chip"
                          style={{
                            background: row.backgroundColor,
                            color: row.textColor ?? "#fff",
                          }}
                          title={`${row.backgroundColor} / ${row.textColor ?? "default"}`}
                        >
                          Aa
                        </span>
                      </td>
                      <td className="daylog-types-page__actions">
                        <button type="button" className="ui-btn" onClick={() => startEdit(row)} disabled={busy}>
                          Edit
                        </button>
                        <button type="button" className="ui-btn" onClick={() => handleDelete(row)} disabled={busy}>
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
