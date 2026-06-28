const ELECTRON_SESSION_FILE = "auth/session.json";

const isElectron = () =>
  typeof window !== "undefined" && !!window.electronAPI;

/** In-memory session so API calls work immediately after login (before disk write finishes). */
let memoryAuth = null;

export const getAuthData = async () => {
  if (memoryAuth && Object.keys(memoryAuth).length > 0) {
    return memoryAuth;
  }

  try {
    if (isElectron()) {
      const data = await window.electronAPI.readJson(ELECTRON_SESSION_FILE);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      memoryAuth = data;
      return data;
    }

    const raw = window.localStorage.getItem("softwareAuth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    memoryAuth = parsed;
    return parsed;
  } catch {
    return null;
  }
};

export const setAuthData = async (auth) => {
  try {
    if (isElectron()) {
      if (!auth) {
        memoryAuth = null;
        await window.electronAPI.writeJson(ELECTRON_SESSION_FILE, {});
        return;
      }

      memoryAuth = {
        ...(memoryAuth || {}),
        ...auth,
      };

      const existing =
        (await window.electronAPI.readJson(ELECTRON_SESSION_FILE)) || {};

      const updated = {
        ...existing,
        ...auth,
        updatedAt: new Date().toISOString(),
      };

      memoryAuth = updated;
      await window.electronAPI.writeJson(ELECTRON_SESSION_FILE, updated);
      return;
    }

    // Browser fallback
    if (!auth) {
      memoryAuth = null;
      window.localStorage.removeItem("softwareAuth");
    } else {
      memoryAuth = auth;
      window.localStorage.setItem("softwareAuth", JSON.stringify(auth));
    }
  } catch {
    // ignore
  }
};

export const clearAuthData = async () => {
  memoryAuth = null;
  await setAuthData(null);
};

