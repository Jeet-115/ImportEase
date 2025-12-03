import { useAuth } from "../context/AuthContext.jsx";

const MasterBadge = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isMaster = !!user.isMaster;

  return (
    <div className="master-badge">
      {isMaster && <span className="master-badge-label">Master</span>}
      <span className="master-badge-email">{user.email}</span>
      <button
        type="button"
        className="master-badge-logout"
        onClick={logout}
        title="Logout"
      >
        Logout
      </button>
    </div>
  );
};

export default MasterBadge;



