import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getAuthData, setAuthData, clearAuthData } from "../utils/authStorage.js";
import { getDeviceId } from "../utils/device.js";
import { loginSoftware } from "../services/authService.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stored = await getAuthData();
        if (!stored) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const isMaster = !!stored.isMaster;
        const expiry = stored.subscriptionExpiry
          ? new Date(stored.subscriptionExpiry)
          : null;

        if (!isMaster && expiry && expiry.getTime() <= Date.now()) {
          if (!cancelled) {
            setUser(null);
            setLocked(true);
            setLockReason("Your subscription has expired. Renew to continue.");
            await clearAuthData();
          }
          return;
        }

        if (!cancelled) {
          setUser(stored);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || user.isMaster) return;
    if (!user.subscriptionExpiry) return;

    const intervalId = setInterval(async () => {
      const expiry = new Date(user.subscriptionExpiry);
      if (Date.now() > expiry.getTime()) {
        setUser(null);
        setLocked(true);
        setLockReason("Your subscription has expired. Renew to continue.");
        await clearAuthData();
        clearInterval(intervalId);
      }
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [user]);

  const login = useCallback(async (email, password) => {
    setLocked(false);
    setLockReason("");

    const deviceId = await getDeviceId();
    const result = await loginSoftware({ email, password, deviceId });

    if (!result?.success) {
      throw new Error(result?.message || "Invalid email or password");
    }

    if (!result.isMaster && result.deviceId && deviceId && result.deviceId !== deviceId) {
      setLocked(true);
      setLockReason("This account is locked to another device.");
      throw new Error("This account is locked to another device.");
    }

    const authPayload = {
      email,
      softwareToken: result.softwareToken,
      isMaster: !!result.isMaster,
      subscriptionExpiry: result.subscriptionExpiry,
      deviceId: result.deviceId || deviceId || null,
    };

    setUser(authPayload);
    await setAuthData(authPayload);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setLocked(false);
    setLockReason("");
    await clearAuthData();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        locked,
        lockReason,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


