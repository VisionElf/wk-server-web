import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchFutureSettings,
  saveFutureSettings,
  type FutureGameSettings,
  type FutureKnownGame,
} from "../api/client";
import "../future-matches.css";

function labelFor(known: FutureKnownGame[], id: string): string {
  const k = known.find((x) => x.id.toLowerCase() === id.toLowerCase());
  return k?.label ?? id;
}

export default function SettingsPage() {
  const [knownGames, setKnownGames] = useState<FutureKnownGame[]>([]);
  const [games, setGames] = useState<FutureGameSettings[]>([]);
  const [draftTeam, setDraftTeam] = useState<Record<string, string>>({});
  const [addSelectId, setAddSelectId] = useState("");
  const [customWikiId, setCustomWikiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setSavedOk(false);
    try {
      const data = await fetchFutureSettings();
      setKnownGames(data.knownGames);
      setGames(
        data.games.map((g) => ({
          id: g.id,
          followTeams: [...g.followTeams],
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const idsInUse = useMemo(
    () => new Set(games.map((g) => g.id.toLowerCase())),
    [games],
  );

  const availableKnown = useMemo(
    () => knownGames.filter((k) => !idsInUse.has(k.id.toLowerCase())),
    [knownGames, idsInUse],
  );

  const addGameFromSelect = () => {
    if (addSelectId === "") {
      return;
    }
    const id = addSelectId.trim();
    if (idsInUse.has(id.toLowerCase())) {
      return;
    }
    setGames((prev) => [...prev, { id, followTeams: [] }]);
    setAddSelectId("");
  };

  const addGameCustom = () => {
    const id = customWikiId.trim().toLowerCase();
    if (id === "" || idsInUse.has(id)) {
      return;
    }
    setGames((prev) => [...prev, { id, followTeams: [] }]);
    setCustomWikiId("");
  };

  const removeGame = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const addTeam = (gameId: string) => {
    const raw = (draftTeam[gameId] ?? "").trim();
    if (raw === "") {
      return;
    }
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) {
          return g;
        }
        if (g.followTeams.some((t) => t.toLowerCase() === raw.toLowerCase())) {
          return g;
        }
        return { ...g, followTeams: [...g.followTeams, raw] };
      }),
    );
    setDraftTeam((d) => ({ ...d, [gameId]: "" }));
  };

  const removeTeam = (gameId: string, team: string) => {
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId
          ? { ...g, followTeams: g.followTeams.filter((t) => t !== team) }
          : g,
      ),
    );
  };

  const onSave = async () => {
    setError(null);
    setSavedOk(false);
    setSaving(true);
    try {
      const data = await saveFutureSettings(games);
      setKnownGames(data.knownGames);
      setGames(
        data.games.map((g) => ({
          id: g.id,
          followTeams: [...g.followTeams],
        })),
      );
      setSavedOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="ui-loading">Loading settings…</div>;
  }

  return (
    <div className="app-page ui-page--constrained fm-page">
      <div className="ui-page-header">
        <div>
          <h1>Followed games &amp; teams</h1>
          <p className="ui-lead">
            Only matches where at least one team name contains one of your
            strings (case-insensitive) are kept. After saving, use{" "}
            <strong>Upcoming → Refresh</strong> to recrawl Liquipedia.
          </p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={() => void onSave()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error != null && <p className="ui-error">{error}</p>}
      {savedOk && <p className="ui-lead fm-saved">Settings saved.</p>}

      <section className="fm-settings-add" aria-label="Add game">
        <h2 className="fm-settings-h2">Add a game</h2>
        <div className="fm-settings-add-row">
          <select
            className="fm-settings-select"
            value={addSelectId}
            onChange={(e) => setAddSelectId(e.target.value)}
            aria-label="Pick a preset wiki"
          >
            <option value="">Preset wikis…</option>
            {availableKnown.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label} ({k.id})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ui-btn"
            onClick={addGameFromSelect}
            disabled={addSelectId === ""}
          >
            Add
          </button>
        </div>
        <div className="fm-settings-add-row fm-settings-add-row--custom">
          <input
            type="text"
            className="ui-input"
            placeholder="Custom Liquipedia wiki id (e.g. smash)"
            value={customWikiId}
            onChange={(e) => setCustomWikiId(e.target.value)}
            maxLength={40}
            aria-label="Custom wiki id"
          />
          <button type="button" className="ui-btn" onClick={addGameCustom}>
            Add custom
          </button>
        </div>
      </section>

      <div className="fm-settings-games">
        {games.length === 0 ? (
          <p className="ui-lead">No games yet. Add one above.</p>
        ) : (
          games.map((g) => (
            <article key={g.id} className="fm-settings-card">
              <div className="fm-settings-card-head">
                <h2 className="fm-settings-card-title">
                  {labelFor(knownGames, g.id)}
                  <span className="fm-settings-id"> · {g.id}</span>
                </h2>
                <button
                  type="button"
                  className="ui-btn ui-btn--danger"
                  onClick={() => removeGame(g.id)}
                >
                  Remove game
                </button>
              </div>
              <p className="ui-lead fm-settings-hint">
                Substring match on Liquipedia team names (e.g.{" "}
                <code>Karmine Corp</code>, <code>Vitality</code>).
              </p>
              <div className="fm-tag-row" role="list">
                {g.followTeams.map((t) => (
                  <span key={t} className="fm-tag" role="listitem">
                    {t}
                    <button
                      type="button"
                      className="fm-tag-remove"
                      aria-label={`Remove ${t}`}
                      onClick={() => removeTeam(g.id, t)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="fm-settings-team-row">
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Team name substring"
                  value={draftTeam[g.id] ?? ""}
                  onChange={(e) =>
                    setDraftTeam((d) => ({ ...d, [g.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTeam(g.id);
                    }
                  }}
                  maxLength={80}
                  aria-label={`Add team filter for ${g.id}`}
                />
                <button
                  type="button"
                  className="ui-btn"
                  onClick={() => addTeam(g.id)}
                >
                  Add team
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
