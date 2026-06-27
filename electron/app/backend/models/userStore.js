import { authMode } from "../config/db.js";
import { User } from "./User.js";
import {
  ensureLocalUsersSeeded,
  findLocalUserByEmail,
  findLocalUserByToken,
  saveLocalUser,
  isLocalAuthEnabled,
} from "./localUserStore.js";

export const initUserStore = async () => {
  if (isLocalAuthEnabled()) {
    await ensureLocalUsersSeeded();
  }
};

export const findUserByEmail = async (email) => {
  const normalized = email.toLowerCase().trim();
  if (authMode === "local") {
    return findLocalUserByEmail(normalized);
  }
  return User.findOne({ email: normalized });
};

export const findUserBySoftwareToken = async (token) => {
  if (authMode === "local") {
    return findLocalUserByToken(token);
  }
  return User.findOne({ softwareToken: token });
};

export const saveUser = async (user) => {
  if (authMode === "local") {
    return saveLocalUser(user);
  }
  await user.save();
  return user;
};
