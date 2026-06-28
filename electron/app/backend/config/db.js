import mongoose from "mongoose";

let isConnected = false;

/** @type {"mongo" | "local"} */
export let authMode = "mongo";

export const isPackagedApp = () =>
  process.env.ELECTRON_IS_PACKAGED === "1" ||
  process.env.ELECTRON_IS_PACKAGED === "true" ||
  process.env.NODE_ENV === "production";

const isLocalAuthAllowed = () => {
  if (isPackagedApp()) {
    return false;
  }
  return (
    process.env.ALLOW_LOCAL_AUTH === "true" ||
    process.env.ALLOW_LOCAL_AUTH === "1"
  );
};

const resolveMongoUri = () => {
  const fromEnv = process.env.MONGO_URI?.trim();
  if (fromEnv) return fromEnv;

  // Packaged builds must always reach the production user database.
  // Historically this URI lived in source; keep as fallback when .env.production
  // is not present on the build machine.
  if (isPackagedApp()) {
    return "mongodb+srv://exe_client:V6KX2K4LwjmhPQ1V@importease.o6i5bq8.mongodb.net/?appName=importease";
  }

  return "";
};

export const connectDB = async () => {
  if (isConnected) {
    return authMode;
  }

  const uri = resolveMongoUri();
  const allowLocal = isLocalAuthAllowed();

  if (!uri) {
    if (allowLocal) {
      authMode = "local";
      console.warn(
        "[mongo] MONGO_URI is not set. Using local JSON auth store for development.",
      );
      return authMode;
    }
    throw new Error(
      "MONGO_URI is not set. Set it in .env.development or enable ALLOW_LOCAL_AUTH=true for local dev.",
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
    });
    isConnected = true;
    authMode = "mongo";
    console.log("[mongo] Connected to MongoDB");
    return authMode;
  } catch (error) {
    console.error("[mongo] Failed to connect to MongoDB:", error.message);
    if (allowLocal) {
      authMode = "local";
      console.warn(
        "[mongo] Falling back to local JSON auth store for development.",
      );
      return authMode;
    }
    throw error;
  }
};
