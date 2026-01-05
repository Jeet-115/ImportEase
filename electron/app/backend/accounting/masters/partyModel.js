import { v4 as uuidv4 } from "uuid";
import {
  mutateAccountingCollection,
  readAccountingCollection,
} from "../../storage/accountingStore.js";

const COLLECTION_NAME = "parties";

export const findAll = async (companyId) =>
  readAccountingCollection(companyId, COLLECTION_NAME);

export const findById = async (companyId, id) => {
  const parties = await readAccountingCollection(companyId, COLLECTION_NAME);
  return parties.find((party) => party.id === id) || null;
};

export const create = async (companyId, payload) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (parties) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      // Default Phase-5 fields
      creditLimit: payload.creditLimit ?? 0,
      defaultCreditPeriodDays: payload.defaultCreditPeriodDays ?? 0,
      billByBillEnabled: payload.billByBillEnabled ?? false,
      interestEnabled: payload.interestEnabled ?? false,
      interestConfig: payload.interestConfig ?? {
        mode: "SIMPLE",
        calculateOn: "VOUCHER_DATE",
        slabs: [],
      },
      gst: payload.gst ?? {
        registrationType: "",
        gstin: "",
        tdsApplicable: false,
        tcsApplicable: false,
      },
      contact: payload.contact ?? {},
      address: payload.address ?? {},
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...parties, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (parties) => {
    const index = parties.findIndex((party) => party.id === id);
    if (index === -1) {
      return { nextData: parties, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...parties[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...parties];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (parties) => {
    const nextData = parties.filter((party) => party.id !== id);
    const removed = parties.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

