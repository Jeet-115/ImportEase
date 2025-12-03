import { User } from "../models/User.js";

const getMasterEmails = () =>
  (process.env.MASTER_ACCOUNTS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const softwareAuthGuard = async (req, res, next) => {
  try {
    const token = req.headers["x-software-token"];
    const headerDeviceId = req.headers["x-device-id"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing software token.",
      });
    }

    const user = await User.findOne({ softwareToken: token });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid software token.",
      });
    }

    const masterEmails = getMasterEmails();
    const isMaster =
      user.isMaster || masterEmails.includes(user.email.toLowerCase());

    if (!isMaster) {
      if (user.deviceId) {
        if (!headerDeviceId || headerDeviceId !== user.deviceId) {
          return res.status(403).json({
            success: false,
            message: "This account is locked to another device.",
          });
        }
      }

      if (
        user.subscriptionActive === false ||
        (user.subscriptionExpiry &&
          new Date(user.subscriptionExpiry).getTime() < Date.now())
      ) {
        return res.status(403).json({
          success: false,
          message: "Subscription expired or inactive.",
        });
      }
    }

    req.softwareUser = {
      id: user._id.toString(),
      email: user.email,
      isMaster,
    };

    next();
  } catch (error) {
    console.error("[middleware] softwareAuthGuard failed:", error);
    res.status(500).json({
      success: false,
      message: "Internal authentication error.",
    });
  }
};


