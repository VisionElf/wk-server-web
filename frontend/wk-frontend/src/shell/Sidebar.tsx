import { NavLink } from "react-router-dom";
import { subApps } from "../core/appRegistry";
import { APP_VERSION_LABEL } from "../core/appVersion";

export function Sidebar() {
  return (
    <aside className="app-sidebar" aria-label="Applications">
      <div className="app-sidebar__brand">WK</div>
      <nav className="app-sidebar__nav">
        {subApps.map((app) => (
          <NavLink
            key={app.id}
            to={app.pathPrefix}
            className={({ isActive }) =>
              `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
            }
          >
            {app.title}
          </NavLink>
        ))}
        <NavLink
          to="/console"
          end
          className={({ isActive }) =>
            `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
          }
        >
          Console
        </NavLink>
      </nav>
      <div className="app-sidebar__footer" aria-hidden="true">
        <span className="app-sidebar__version">{APP_VERSION_LABEL}</span>
      </div>
    </aside>
  );
}
