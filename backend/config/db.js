import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn(
      "[mongo] MONGO_URI is not set. Skipping MongoDB connection for auth.",
    );
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log("[mongo] Connected to MongoDB");
  } catch (error) {
    console.error("[mongo] Failed to connect to MongoDB:", error);
    throw error;
  }
};


