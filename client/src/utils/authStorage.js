const ELECTRON_SESSION_FILE = "auth/session.json";

const isElectron = () =>
  typeof window !== "undefined" && !!window.electronAPI;

export const getAuthData = async () => {
  try {
    if (isElectron()) {
      const data = await window.electronAPI.readJson(ELECTRON_SESSION_FILE);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      return data;
    }

    const raw = window.localStorage.getItem("softwareAuth");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuthData = async (auth) => {
  try {
    if (isElectron()) {
      if (!auth) {
        await window.electronAPI.writeJson(ELECTRON_SESSION_FILE, {});
        return;
      }

      const existing =
        (await window.electronAPI.readJson(ELECTRON_SESSION_FILE)) || {};

      const updated = {
        ...existing,
        ...auth,
        updatedAt: new Date().toISOString(),
      };

      await window.electronAPI.writeJson(ELECTRON_SESSION_FILE, updated);
      return;
    }

    // Browser fallback
    if (!auth) {
      window.localStorage.removeItem("softwareAuth");
    } else {
      window.localStorage.setItem(
        "softwareAuth",
        JSON.stringify(auth),
      );
    }
  } catch {
    // ignore
  }
};


export const clearAuthData = async () => {
  await setAuthData(null);
};


