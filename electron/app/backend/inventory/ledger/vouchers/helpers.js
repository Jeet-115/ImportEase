import { v4 as uuidv4 } from "uuid";
import { addTransaction, addTransactions } from "../transactions/model.js";
import { appendVoucher } from "../../../storage/inventoryLedgerStore.js";

/**
 * Create inventory transaction from voucher line item
 */
export const createTransaction = (companyId, voucherData, lineItem) => {
  const {
    voucherType,
    voucherId,
    date,
    trackingNo = null,
  } = voucherData;

  const {
    itemId,
    batchId = null,
    godownId,
    qty,
    rate = 0,
    value = null,
  } = lineItem;

  return {
    txId: uuidv4(),
    companyId,
    voucherType,
    voucherId,
    trackingNo,
    itemId,
    batchId,
    godownId,
    qty: Number(qty),
    rate: Number(rate),
    value: value !== null ? Number(value) : Number(qty) * Number(rate),
    date,
    mode: voucherType === "PHYSICAL" ? "ABSOLUTE" : "DELTA",
    createdAt: new Date().toISOString(),
  };
};

/**
 * Save voucher and create transactions
 */
export const saveVoucherWithTransactions = async (companyId, voucherType, voucher, transactions) => {
  // Save voucher JSON (UI & accounting data)
  await appendVoucher(companyId, voucherType, voucher);
  
  // Append transactions to ledger (stock movement)
  await addTransactions(companyId, transactions);
  
  return { voucher, transactions };
};

