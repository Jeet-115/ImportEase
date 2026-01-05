import {
  mutateAccountingCollection,
  readAccountingCollection,
} from "../../storage/accountingStore.js";

const COLLECTION_NAME = "outstanding";

export const findAll = async (companyId) =>
  readAccountingCollection(companyId, COLLECTION_NAME);

export const findByParty = async (companyId, partyId) => {
  const outstanding = await findAll(companyId);
  return outstanding.filter((bill) => bill.partyId === partyId);
};

export const findByVoucher = async (companyId, voucherId) => {
  const outstanding = await findAll(companyId);
  return outstanding.find((bill) => bill.voucherId === voucherId) || null;
};

export const create = async (companyId, payload) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (bills) => {
    // Check if already exists
    const existing = bills.find((bill) => bill.voucherId === payload.voucherId);
    if (existing) {
      throw new Error(`Outstanding bill for voucher ${payload.voucherId} already exists`);
    }

    const bill = {
      partyId: payload.partyId,
      voucherId: payload.voucherId,
      voucherType: payload.voucherType, // "SALES" | "PURCHASE" | "CREDIT_NOTE" | "DEBIT_NOTE"
      date: payload.date,
      dueDate: payload.dueDate || payload.date,
      originalAmount: payload.originalAmount,
      balance: payload.balance || payload.originalAmount,
      interestAccrued: payload.interestAccrued || 0,
      isCredit: payload.isCredit || false, // true for credit notes, false for invoices
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { nextData: [...bills, bill], result: bill };
  });

export const updateBalance = async (companyId, voucherId, amount, isCredit = false) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (bills) => {
    const index = bills.findIndex((bill) => bill.voucherId === voucherId);
    if (index === -1) {
      return { nextData: bills, result: null, skipWrite: true };
    }

    const bill = bills[index];
    let newBalance = bill.balance;

    if (isCredit) {
      // Receipt or credit note reduces balance
      newBalance = Math.max(0, bill.balance - Math.abs(amount));
    } else {
      // Debit note increases balance
      newBalance = bill.balance + Math.abs(amount);
    }

    const updated = {
      ...bill,
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    };

    const nextData = [...bills];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const updateInterest = async (companyId, voucherId, interestAccrued) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (bills) => {
    const index = bills.findIndex((bill) => bill.voucherId === voucherId);
    if (index === -1) {
      return { nextData: bills, result: null, skipWrite: true };
    }

    const updated = {
      ...bills[index],
      interestAccrued: interestAccrued,
      updatedAt: new Date().toISOString(),
    };

    const nextData = [...bills];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteByVoucher = async (companyId, voucherId) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (bills) => {
    const nextData = bills.filter((bill) => bill.voucherId !== voucherId);
    const removed = bills.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

export const getPartyOutstandingSummary = async (companyId, partyId) => {
  const bills = await findByParty(companyId, partyId);
  const totalOutstanding = bills.reduce((sum, bill) => sum + (bill.balance || 0), 0);
  const totalInterest = bills.reduce((sum, bill) => sum + (bill.interestAccrued || 0), 0);
  
  // Calculate overdue
  const now = new Date();
  const overdueBills = bills.filter((bill) => {
    const dueDate = new Date(bill.dueDate);
    return dueDate < now && bill.balance > 0;
  });
  const overdueAmount = overdueBills.reduce((sum, bill) => sum + (bill.balance || 0), 0);

  return {
    totalOutstanding,
    totalInterest,
    overdueAmount,
    overdueBills: overdueBills.length,
    bills,
  };
};

