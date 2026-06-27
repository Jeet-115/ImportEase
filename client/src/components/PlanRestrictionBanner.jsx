import { FiLock } from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const PlanRestrictionBanner = ({ className = "" }) => {
  const { user, isPlanRestricted } = useAuth();

  if (!user || user.isMaster || !isPlanRestricted) {
    return null;
  }

  return (
    <div
      className={`ie-card flex gap-3 border-slate-200/80 bg-amber-50/90 p-4 text-sm text-amber-900 ${className}`}
    >
      <FiLock className="mt-0.5 shrink-0 text-teal-600" size={18} />
      <div>
        <p className="font-semibold">Read-only access</p>
        <p className="mt-1 text-xs text-amber-800/90">
          {getPlanRestrictionMessage(user.planStatus)}
        </p>
      </div>
    </div>
  );
};

export default PlanRestrictionBanner;
