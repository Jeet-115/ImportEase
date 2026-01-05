import {
  readInventoryTransactions,
  appendInventoryTransaction,
  appendInventoryTransactions,
} from "../../../storage/inventoryLedgerStore.js";

export const findAllTransactions = async (companyId) =>
  readInventoryTransactions(companyId);

export const findTransactionsByFilter = async (companyId, filter) => {
  const transactions = await findAllTransactions(companyId);
  
  return transactions.filter((tx) => {
    if (filter.itemId && tx.itemId !== filter.itemId) return false;
    if (filter.godownId && tx.godownId !== filter.godownId) return false;
    if (filter.batchId !== undefined) {
      if (filter.batchId === null && tx.batchId !== null) return false;
      if (filter.batchId !== null && tx.batchId !== filter.batchId) return false;
    }
    if (filter.voucherType && tx.voucherType !== filter.voucherType) return false;
    if (filter.voucherId && tx.voucherId !== filter.voucherId) return false;
    if (filter.fromDate && tx.date < filter.fromDate) return false;
    if (filter.toDate && tx.date > filter.toDate) return false;
    return true;
  });
};

export const addTransaction = async (companyId, transaction) => {
  const transactions = await appendInventoryTransaction(companyId, transaction);
  return transactions[transactions.length - 1];
};

export const addTransactions = async (companyId, transactions) => {
  await appendInventoryTransactions(companyId, transactions);
  return transactions;
};

// Stock Computation Engine (CRITICAL)
export const computeStock = async (companyId, itemId, godownId, batchId = null) => {
  const transactions = await findAllTransactions(companyId);
  
  // Filter relevant transactions
  const relevant = transactions.filter((tx) => {
    if (tx.itemId !== itemId) return false;
    if (tx.godownId !== godownId) return false;
    if (batchId === null && tx.batchId !== null) return false;
    if (batchId !== null && tx.batchId !== batchId) return false;
    return true;
  });
  
  // Sort by date, then by creation order (txId for tie-breaking)
  relevant.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.txId.localeCompare(b.txId);
  });
  
  // Find latest PHYSICAL entry
  let physicalIndex = -1;
  for (let i = relevant.length - 1; i >= 0; i--) {
    if (relevant[i].voucherType === "PHYSICAL" && relevant[i].mode === "ABSOLUTE") {
      physicalIndex = i;
      break;
    }
  }
  
  // Start from latest PHYSICAL qty, or 0 if none
  let stock = physicalIndex >= 0 ? relevant[physicalIndex].qty : 0;
  
  // Add all DELTA movements after the PHYSICAL entry
  const startIndex = physicalIndex + 1;
  for (let i = startIndex; i < relevant.length; i++) {
    if (relevant[i].mode === "DELTA") {
      stock += relevant[i].qty;
    }
  }
  
  return stock;
};

export const computeStockForAllItems = async (companyId) => {
  const transactions = await findAllTransactions(companyId);
  const stockMap = new Map();
  
  // Group by itemId + godownId + batchId
  const groups = new Map();
  for (const tx of transactions) {
    const key = `${tx.itemId}|${tx.godownId}|${tx.batchId || "null"}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(tx);
  }
  
  // Compute stock for each group
  for (const [key, groupTxs] of groups) {
    const [itemId, godownId, batchIdStr] = key.split("|");
    const batchId = batchIdStr === "null" ? null : batchIdStr;
    
    // Sort by date
    groupTxs.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.txId.localeCompare(b.txId);
    });
    
    // Find latest PHYSICAL
    let physicalIndex = -1;
    for (let i = groupTxs.length - 1; i >= 0; i--) {
      if (groupTxs[i].voucherType === "PHYSICAL" && groupTxs[i].mode === "ABSOLUTE") {
        physicalIndex = i;
        break;
      }
    }
    
    let stock = physicalIndex >= 0 ? groupTxs[physicalIndex].qty : 0;
    
    // Add DELTA movements after PHYSICAL
    for (let i = physicalIndex + 1; i < groupTxs.length; i++) {
      if (groupTxs[i].mode === "DELTA") {
        stock += groupTxs[i].qty;
      }
    }
    
    stockMap.set(key, {
      itemId,
      godownId,
      batchId,
      stock,
    });
  }
  
  return Array.from(stockMap.values());
};

