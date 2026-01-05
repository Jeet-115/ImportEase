import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "costTracks");

export const findById = async (companyId, id) => {
  const tracks = await findAll(companyId);
  return tracks.find((track) => track.trackId === id) || null;
};

export const findByItemId = async (companyId, itemId) => {
  const tracks = await findAll(companyId);
  return tracks.filter((track) => track.itemId === itemId);
};

export const findByPartyId = async (companyId, partyId) => {
  const tracks = await findAll(companyId);
  return tracks.filter((track) => track.partyId === partyId);
};

export const findByStatus = async (companyId, status) => {
  const tracks = await findAll(companyId);
  return tracks.filter((track) => track.status === status);
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "costTracks", (tracks) => {
    const now = new Date().toISOString();
    const record = {
      trackId: uuidv4(),
      status: "OPEN",
      movements: [],
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...tracks, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "costTracks", (tracks) => {
    const index = tracks.findIndex((track) => track.trackId === id);
    if (index === -1) {
      return { nextData: tracks, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...tracks[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...tracks];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const addMovement = async (companyId, trackId, movement) =>
  mutateInventoryCollection(companyId, "costTracks", (tracks) => {
    const index = tracks.findIndex((track) => track.trackId === trackId);
    if (index === -1) {
      return { nextData: tracks, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...tracks[index],
      movements: [...tracks[index].movements, movement],
      updatedAt: now,
    };

    const nextData = [...tracks];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const closeTrack = async (companyId, trackId) =>
  updateById(companyId, trackId, { status: "CLOSED" });

export const openTrack = async (companyId, trackId) =>
  updateById(companyId, trackId, { status: "OPEN" });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "costTracks", (tracks) => {
    const nextData = tracks.filter((track) => track.trackId !== id);
    const removed = tracks.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

