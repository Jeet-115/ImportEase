import { v4 as uuidv4 } from "uuid";
import { findById as findPartyById } from "../masters/partyModel.js";
import { getPartyOutstandingSummary } from "../outstanding/outstandingModel.js";
import { getItemValuationSnapshot } from "../../inventory/valuation/valuationEngine.js";
import { computeStock } from "../../inventory/ledger/transactions/model.js";
import { saveVoucherWithTransactions, createTransaction } from "../../inventory/ledger/vouchers/helpers.js";
import { appendVoucher } from "../../storage/inventoryLedgerStore.js";
import { appendAccountingVoucher } from "../../storage/accountingStore.js";
import { create as createOutstanding } from "../outstanding/outstandingModel.js";
import { buildFifoLayers } from "../../inventory/valuation/fifoEngine.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[SalesWizardController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

// Calculate COGS for a sale using FIFO
const calculateCOGS = async (companyId, items) => {
  const cogsByItem = [];
  let totalCOGS = 0;

  // Build FIFO layers for all items before sale
  const layersByKey = new Map();
  const keyOf = (item) => `${item.itemId}|${item.godownId || ""}|${item.batchId || ""}`;

  // Load all transactions up to now to build layers
  const { findAllTransactions } = await import("../../inventory/ledger/transactions/model.js");
  const allTxs = await findAllTransactions(companyId);
  allTxs.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.txId.localeCompare(b.txId);
  });

  // Build layers for each item
  for (const item of items) {
    const key = keyOf(item);
    if (!layersByKey.has(key)) {
      const filter = {
        itemId: item.itemId,
        godownId: item.godownId,
        batchId: item.batchId || null,
        date: null,
      };
      const fifo = await buildFifoLayers(companyId, filter);
      layersByKey.set(key, [...fifo.fifoLayers]);
    }
  }

  // Consume from layers for this sale
  for (const item of items) {
    const key = keyOf(item);
    const layers = layersByKey.get(key) || [];
    const outQty = Math.abs(item.qty);
    let remaining = outQty;
    let consumedValue = 0;

    for (const layer of layers) {
      if (remaining <= 0) break;
      const take = Math.min(layer.qty, remaining);
      if (take > 0) {
        consumedValue += take * layer.rate;
        remaining -= take;
      }
    }

    cogsByItem.push({
      itemId: item.itemId,
      qty: outQty,
      cogs: consumedValue,
    });
    totalCOGS += consumedValue;
  }

  return { totalCOGS, cogsByItem };
};

export const createSalesWizard = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const {
    partyId,
    date,
    items,
    createDeliveryNote = false,
    trackingNo = null,
    priceLevel = "STANDARD",
    remarks = "",
  } = req.body;

  if (!companyId || !partyId || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "companyId, partyId, date, and items array are required",
    });
  }

  // 1. Validate party and credit limits
  const party = await findPartyById(companyId, partyId);
  if (!party) {
    return res.status(404).json({ message: "Party not found" });
  }

  if (party.creditLimit > 0) {
    const outstanding = await getPartyOutstandingSummary(companyId, partyId);
    const currentOutstanding = outstanding.totalOutstanding || 0;
    
    // Calculate this sale amount
    let saleAmount = 0;
    for (const item of items) {
      saleAmount += (item.qty || 0) * (item.rate || 0);
    }

    if (currentOutstanding + saleAmount > party.creditLimit) {
      return res.status(400).json({
        message: `Credit limit exceeded. Current outstanding: ${currentOutstanding}, Sale amount: ${saleAmount}, Credit limit: ${party.creditLimit}`,
      });
    }

    // Check overdue bills if configured
    if (party.billByBillEnabled && outstanding.overdueAmount > 0) {
      return res.status(400).json({
        message: `Party has overdue bills. Overdue amount: ${outstanding.overdueAmount}`,
      });
    }
  }

  // 2. Auto-price items using Phase-4 valuation
  const pricedItems = [];
  for (const item of items) {
    if (!item.itemId || !item.godownId || item.qty === undefined) {
      return res.status(400).json({
        message: "Each item must have itemId, godownId, and qty",
      });
    }

    // Get market price from valuation
    const valuation = await getItemValuationSnapshot(companyId, {
      itemId: item.itemId,
      godownId: item.godownId,
      batchId: item.batchId || null,
      date,
    });

    // Use market rate if not provided
    const rate = item.rate || valuation.marketRate || 0;
    if (rate <= 0) {
      return res.status(400).json({
        message: `No pricing available for item ${item.itemId}. Please provide rate.`,
      });
    }

    // Check stock availability
    const availableStock = await computeStock(
      companyId,
      item.itemId,
      item.godownId,
      item.batchId || null
    );

    if (availableStock < Math.abs(item.qty)) {
      return res.status(400).json({
        message: `Insufficient stock for item ${item.itemId}. Available: ${availableStock}, Required: ${Math.abs(item.qty)}`,
      });
    }

    pricedItems.push({
      ...item,
      rate,
      saleValue: Math.abs(item.qty) * rate,
    });
  }

  // 3. Calculate total sale amount and COGS
  const totalSaleAmount = pricedItems.reduce((sum, item) => sum + item.saleValue, 0);
  const { totalCOGS, cogsByItem } = await calculateCOGS(companyId, pricedItems);
  const totalProfit = totalSaleAmount - totalCOGS;

  // 4. Generate voucher numbers
  const voucherNo = `SAL-${Date.now()}`;
  const voucherId = `SAL-${voucherNo}`;

  // 5. Create delivery note if requested
  let deliveryNoteVoucher = null;
  let deliveryNoteTrackingNo = trackingNo;

  if (createDeliveryNote) {
    if (!deliveryNoteTrackingNo) {
      deliveryNoteTrackingNo = `DN-${Date.now()}`;
    }

    const dnVoucherId = `DN-${voucherNo}`;
    const dnVoucher = {
      voucherId: dnVoucherId,
      voucherNo: `DN-${voucherNo}`,
      date,
      partyId,
      items: pricedItems.map((item) => ({
        itemId: item.itemId,
        godownId: item.godownId,
        batchId: item.batchId || null,
        qty: -Math.abs(item.qty), // Negative for outward
        rate: item.rate,
      })),
      trackingNo: deliveryNoteTrackingNo,
      remarks: `Auto-generated for ${voucherId}`,
      createdAt: new Date().toISOString(),
    };

    // Create delivery note transactions
    const dnTransactions = pricedItems.map((item) =>
      createTransaction(
        companyId,
        {
          voucherType: "DELIVERY_NOTE",
          voucherId: dnVoucherId,
          date,
          trackingNo: deliveryNoteTrackingNo,
        },
        {
          itemId: item.itemId,
          godownId: item.godownId,
          batchId: item.batchId || null,
          qty: -Math.abs(item.qty),
          rate: item.rate,
        }
      )
    );

    await saveVoucherWithTransactions(companyId, "deliveryNotes", dnVoucher, dnTransactions);
    deliveryNoteVoucher = dnVoucher;
  }

  // 6. Create sales voucher
  const salesVoucher = {
    voucherId,
    voucherNo,
    date,
    partyId,
    items: pricedItems.map((item) => ({
      itemId: item.itemId,
      godownId: item.godownId,
      batchId: item.batchId || null,
      qty: -Math.abs(item.qty),
      rate: item.rate,
    })),
    trackingNo: deliveryNoteTrackingNo,
    remarks,
    createdAt: new Date().toISOString(),
  };

  // Create sales transactions (if not already created by delivery note)
  let salesTransactions = [];
  if (!createDeliveryNote) {
    salesTransactions = pricedItems.map((item) =>
      createTransaction(
        companyId,
        {
          voucherType: "SALES",
          voucherId,
          date,
          trackingNo: null,
        },
        {
          itemId: item.itemId,
          godownId: item.godownId,
          batchId: item.batchId || null,
          qty: -Math.abs(item.qty),
          rate: item.rate,
        }
      )
    );
    await saveVoucherWithTransactions(companyId, "salesVouchers", salesVoucher, salesTransactions);
  } else {
    await appendVoucher(companyId, "salesVouchers", salesVoucher);
  }

  // 7. Create accounting voucher
  const accountingVoucher = {
    voucherId,
    voucherType: "SALES",
    date,
    partyId,
    partyName: party.name || "",
    totalAmount: totalSaleAmount,
    cogs: totalCOGS,
    profit: totalProfit,
    items: pricedItems.map((item, idx) => ({
      ...item,
      cogs: cogsByItem[idx]?.cogs || 0,
    })),
    gst: party.gst || {},
    createdAt: new Date().toISOString(),
  };

  await appendAccountingVoucher(companyId, "sales", accountingVoucher);

  // 8. Create outstanding bill
  if (party.billByBillEnabled) {
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + (party.defaultCreditPeriodDays || 0));

    await createOutstanding(companyId, {
      partyId,
      voucherId,
      voucherType: "SALES",
      date,
      dueDate: dueDate.toISOString().split("T")[0],
      originalAmount: totalSaleAmount,
      balance: totalSaleAmount,
      isCredit: false,
    });
  }

  return res.status(201).json({
    success: true,
    deliveryNote: deliveryNoteVoucher,
    salesVoucher,
    accountingVoucher,
    profit: {
      saleAmount: totalSaleAmount,
      cogs: totalCOGS,
      profit: totalProfit,
      profitMargin: totalSaleAmount > 0 ? (totalProfit / totalSaleAmount) * 100 : 0,
    },
    transactions: salesTransactions,
  });
});

