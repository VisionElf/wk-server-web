import { NavLink, useLocation } from "react-router-dom";
import { subApps } from "../core/appRegistry";
import { getActiveSubApp } from "../core/activeSubApp";

export function AppSubNav() {
  const { pathname } = useLocation();
  const active = getActiveSubApp(pathname, subApps);

  if (!active || active.subNav.length === 0) {
    return null;
  }

  return (
    <header className="app-subnav" role="navigation" aria-label="Section">
      {active.subNav.map((item) => {
        const to = `${active.pathPrefix}/${item.id}`;
        return (
          <NavLink
            key={item.id}
            to={to}
            end
            className={({ isActive }) =>
              `app-subnav__link${isActive ? " app-subnav__link--active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        );
      })}
    </header>
  );
}
