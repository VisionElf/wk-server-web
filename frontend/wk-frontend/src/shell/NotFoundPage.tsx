import { Link } from "react-router-dom";
import { defaultLandingPath } from "../core/appRegistry";

export default function NotFoundPage() {
  return (
    <div className="app-notFound app-page">
      <h1>Page not found</h1>
      <p>
        <Link to={defaultLandingPath}>Back to app</Link>
      </p>
    </div>
  );
}
