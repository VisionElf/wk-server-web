export default function AboutPage() {
  return (
    <div className="app-page ui-page--constrained">
      <h1>About this app</h1>
      <p className="ui-lead">
        Match rows are scraped from{" "}
        <a href="https://liquipedia.net/" target="_blank" rel="noreferrer">
          Liquipedia
        </a>{" "}
        (<code>Liquipedia:Matches</code> per game wiki). This project is not
        affiliated with Liquipedia; respect their{" "}
        <a
          href="https://liquipedia.net/commons/Liquipedia:Privacy_policy"
          target="_blank"
          rel="noreferrer"
        >
          terms of use
        </a>{" "}
        and avoid excessive refresh.
      </p>
      <p className="ui-lead">
        There is no database: results are stored in a JSON file on the API
        server under <code>Data/Cache/</code>. Team logos are downloaded once
        and cached as files next to that JSON; the API serves them from{" "}
        <code>/api/future-matches/media/…</code>. With Docker Compose, a named
        volume keeps that folder across container restarts.
      </p>
      <p className="ui-lead">
        Configure games and team name filters in{" "}
        <code>appsettings.json</code> under <code>FutureMatches:Games</code>.
      </p>
    </div>
  );
}
