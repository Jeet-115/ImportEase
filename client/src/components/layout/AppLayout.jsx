import { motion } from "framer-motion";
import { FiBook, FiHome, FiLogOut } from "react-icons/fi";
import { NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getPlanRestrictionMessage } from "../../utils/planAccess.js";
import logo from "/logo.png";

const AppLayout = () => {
  const { user, logout, isPlanRestricted } = useAuth();
  const location = useLocation();
  const companyMatch = useMatch("/company/:companyId/*");
  const companyId = companyMatch?.params?.companyId;

  const planLabel = user?.isMaster
    ? "Master"
    : isPlanRestricted
      ? user?.planStatus === "expired"
        ? "Expired"
        : "Inactive"
      : "Active";

  const planClass = user?.isMaster
    ? "ie-plan-badge ie-plan-badge--master"
    : isPlanRestricted
      ? "ie-plan-badge ie-plan-badge--warn"
      : "ie-plan-badge ie-plan-badge--active";

  return (
    <div className="ie-app-bg flex min-h-screen flex-col">
      <header className="ie-topbar sticky top-0 z-30">
        <div className="ie-topbar-inner">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg shadow-sm ring-1 ring-white/15"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white">
                ImportEase
              </p>
              <p className="truncate text-[10px] font-medium text-teal-300/90">
                {companyId
                  ? "Client workspace active"
                  : "Select a client to begin"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className={planClass}>{planLabel}</span>
            <div className="hidden max-w-[180px] truncate text-right sm:block">
              <p className="truncate text-xs font-medium text-slate-200">
                {user?.email}
              </p>
              {isPlanRestricted && !user?.isMaster ? (
                <p className="truncate text-[10px] text-amber-300/90">
                  {getPlanRestrictionMessage(user?.planStatus)}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500">Signed in</p>
              )}
            </div>
            <button
              type="button"
              onClick={logout}
              className="ie-topbar-btn"
              title="Sign out"
            >
              <FiLogOut />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <nav className="ie-subnav" aria-label="Main navigation">
          <div className="ie-subnav-group">
            <span className="ie-subnav-label">Navigate</span>
            <div className="ie-subnav-pills">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  ["ie-nav-pill", isActive ? "ie-nav-pill--active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <FiHome size={14} aria-hidden />
                Clients
              </NavLink>
              <NavLink
                to="/ledger-names"
                className={({ isActive }) =>
                  ["ie-nav-pill", isActive ? "ie-nav-pill--active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <FiBook size={14} aria-hidden />
                Ledger names
              </NavLink>
              {companyId ? (
                <NavLink
                  to={`/company/${companyId}`}
                  className={({ isActive }) =>
                    [
                      "ie-nav-pill",
                      isActive && location.pathname === `/company/${companyId}`
                        ? "ie-nav-pill--active"
                        : location.pathname.startsWith(`/company/${companyId}`)
                          ? "ie-nav-pill--active"
                          : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                >
                  Client features
                </NavLink>
              ) : null}
            </div>
          </div>
        </nav>
      </header>

      <motion.main
        key={location.pathname}
        className="relative z-10 flex-1 px-4 py-6 sm:px-6 sm:py-8"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.17, 0.67, 0.83, 0.67] }}
      >
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
};

export default AppLayout;
