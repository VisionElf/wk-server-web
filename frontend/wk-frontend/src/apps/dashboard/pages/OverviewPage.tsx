import { useEffect, useState } from "react";
import { apiHeaders } from "../../../core/apiHeaders";

export default function OverviewPage() {
  const [message, setMessage] = useState("Loading…");

  useEffect(() => {
    fetch("/api/hello", { headers: apiHeaders() })
      .then((res) => res.json())
      .then((data: { message?: string }) =>
        setMessage(data.message ?? "No message"),
      )
      .catch(() => setMessage("Could not reach API"));
  }, []);

  return (
    <div className="app-page">
      <h1>Overview</h1>
      <p>Sample sub-app page with API check.</p>
      <p>
        <code>{message}</code>
      </p>
    </div>
  );
}
