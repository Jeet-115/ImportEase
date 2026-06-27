import mongoose from "mongoose";

let isConnected = false;

/** @type {"mongo" | "local"} */
export let authMode = "mongo";

export const connectDB = async () => {
  if (isConnected) {
    return authMode;
  }

  const uri = process.env.MONGO_URI?.trim();
  const allowLocal =
    process.env.ALLOW_LOCAL_AUTH === "true" ||
    process.env.ALLOW_LOCAL_AUTH === "1";

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
