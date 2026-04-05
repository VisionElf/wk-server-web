import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteFutureGameBanner,
  fetchFutureSettings,
  saveFutureSettings,
  uploadFutureGameBanner,
  type FutureGameSettings,
  type FutureKnownGame,
  type FutureSettingsResponse,
} from "@/apps/future-matches/api/client";

function labelFor(known: FutureKnownGame[], id: string): string {
  const k = known.find((x) => x.id.toLowerCase() === id.toLowerCase());
  return k?.label ?? id;
}

/** Normalize user input toward Liquipedia page title (spaces → underscores). */
function normalizeTeamPageId(raw: string): string {
  return raw.trim().replace(/\s+/g, "_");
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
  const [bannerBusyId, setBannerBusyId] = useState<string | null>(null);
  const bannerPickGameId = useRef<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    setSavedOk(false);
    try {
      const data = await fetchFutureSettings();
      setKnownGames(data.knownGames);
      setGames(
        data.games.map((g) => ({
          id: g.id,
          followTeamIds: [...g.followTeamIds],
          customBannerUrl: g.customBannerUrl ?? null,
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
    setGames((prev) => [...prev, { id, followTeamIds: [] }]);
    setAddSelectId("");
  };

  const addGameCustom = () => {
    const id = customWikiId.trim().toLowerCase();
    if (id === "" || idsInUse.has(id)) {
      return;
    }
    setGames((prev) => [...prev, { id, followTeamIds: [] }]);
    setCustomWikiId("");
  };

  const removeGame = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const addTeam = (gameId: string) => {
    const id = normalizeTeamPageId(draftTeam[gameId] ?? "");
    if (id === "") {
      return;
    }
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) {
          return g;
        }
        if (
          g.followTeamIds.some((t) => t.toLowerCase() === id.toLowerCase())
        ) {
          return g;
        }
        return { ...g, followTeamIds: [...g.followTeamIds, id] };
      }),
    );
    setDraftTeam((d) => ({ ...d, [gameId]: "" }));
  };

  const removeTeam = (gameId: string, team: string) => {
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId
          ? { ...g, followTeamIds: g.followTeamIds.filter((t) => t !== team) }
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
      applySettingsFromResponse(data);
      setSavedOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const applySettingsFromResponse = (data: FutureSettingsResponse) => {
    setKnownGames(data.knownGames);
    setGames(
      data.games.map((g) => ({
        id: g.id,
        followTeamIds: [...g.followTeamIds],
        customBannerUrl: g.customBannerUrl ?? null,
      })),
    );
  };

  const startBannerPick = (gameId: string) => {
    bannerPickGameId.current = gameId;
    bannerFileInputRef.current?.click();
  };

  const onBannerFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const gameId = bannerPickGameId.current;
    const file = e.target.files?.[0];
    e.target.value = "";
    bannerPickGameId.current = null;
    if (gameId == null || file == null) {
      return;
    }
    setError(null);
    setSavedOk(false);
    setBannerBusyId(gameId);
    try {
      const data = await uploadFutureGameBanner(gameId, file);
      applySettingsFromResponse(data);
      setSavedOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBannerBusyId(null);
    }
  };

  const onRemoveBanner = async (gameId: string) => {
    setError(null);
    setSavedOk(false);
    setBannerBusyId(gameId);
    try {
      const data = await deleteFutureGameBanner(gameId);
      applySettingsFromResponse(data);
      setSavedOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove banner failed");
    } finally {
      setBannerBusyId(null);
    }
  };

  if (loading) {
    return <div className="ui-loading">Loading settings…</div>;
  }

  return (
    <div className="app-page ui-page--constrained fm-page">
      <div className="ui-page-header">
        <div className="ui-page-header__intro">
          <h1>Followed games &amp; teams</h1>
          <p className="ui-lead">
            Add Liquipedia <strong>team page IDs</strong> (URL title, e.g.{" "}
            <code>Team_Vitality</code>, <code>Karmine_Corp</code>). Matches are
            kept when a team link matches one of those IDs (case-insensitive).
            After saving, use <strong>Upcoming → Refresh</strong> to recrawl
            Liquipedia.
          </p>
        </div>
        <div className="ui-page-actions">
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={() => void onSave()}
            disabled={saving}
            title="Save games and teams to the server. Use Upcoming → Refresh afterward to recrawl Liquipedia."
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error != null && <p className="ui-error">{error}</p>}
      {savedOk && <p className="ui-lead fm-saved">Settings saved.</p>}

      <section className="fm-settings-add" aria-label="Add game">
        <h2 className="fm-settings-h2">Add a game</h2>
        <div className="fm-settings-add-row">
          <select
            className="ui-select fm-settings-select"
            value={addSelectId}
            onChange={(e) => setAddSelectId(e.target.value)}
            aria-label="Pick a preset wiki"
            title="Choose a preset Liquipedia wiki, then click Add."
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
            title="Add the selected wiki to your followed games (not saved until Save)."
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
          <button
            type="button"
            className="ui-btn"
            onClick={addGameCustom}
            title="Add a game by custom Liquipedia wiki id (slug, e.g. smash)."
          >
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
                  title="Remove this game from the list (click Save to persist)."
                >
                  Remove game
                </button>
              </div>
              <p className="ui-lead fm-settings-hint">
                Page title segment from the team wiki URL (underscores, not
                spaces).
              </p>
              <div className="fm-settings-banner-row">
                {g.customBannerUrl != null && g.customBannerUrl !== "" ? (
                  <img
                    className="fm-settings-banner-preview"
                    src={g.customBannerUrl}
                    alt=""
                    width={160}
                    height={48}
                    loading="lazy"
                  />
                ) : null}
                <button
                  type="button"
                  className="ui-btn"
                  disabled={bannerBusyId === g.id}
                  onClick={() => startBannerPick(g.id)}
                  title="Choose an image file to use as this game’s banner in the UI."
                >
                  {bannerBusyId === g.id ? "Working…" : "Upload banner"}
                </button>
                {g.customBannerUrl != null && g.customBannerUrl !== "" ? (
                  <button
                    type="button"
                    className="ui-btn ui-btn--danger"
                    disabled={bannerBusyId === g.id}
                    onClick={() => void onRemoveBanner(g.id)}
                    title="Remove the custom banner for this game."
                  >
                    Remove banner
                  </button>
                ) : null}
              </div>
              <div className="fm-tag-row" role="list">
                {g.followTeamIds.map((t) => (
                  <span key={t} className="fm-tag" role="listitem">
                    {t}
                    <button
                      type="button"
                      className="fm-tag-remove"
                      aria-label={`Remove ${t}`}
                      title={`Remove ${t} from this game’s follow list.`}
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
                  placeholder="e.g. Team_Vitality"
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
                  aria-label={`Add team page id for ${g.id}`}
                />
                <button
                  type="button"
                  className="ui-btn"
                  onClick={() => addTeam(g.id)}
                  title="Add the team page id from the field to this game’s follow list."
                >
                  Add team
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="fm-file-input-hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void onBannerFileChange(e)}
      />
    </div>
  );
}
