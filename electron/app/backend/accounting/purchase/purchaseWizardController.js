import { v4 as uuidv4 } from "uuid";
import { findById as findPartyById, findAll as findAllParties } from "../masters/partyModel.js";
import { saveVoucherWithTransactions, createTransaction } from "../../inventory/ledger/vouchers/helpers.js";
import { appendVoucher } from "../../storage/inventoryLedgerStore.js";
import { appendAccountingVoucher } from "../../storage/accountingStore.js";
import { create as createOutstanding, findByVoucher } from "../outstanding/outstandingModel.js";
import { getStockItemById } from "../../inventory/items/model.js";
import { getGodownById } from "../../inventory/godowns/model.js";
import { findByTrackingNo, create as createTracking } from "../../inventory/ledger/tracking/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[PurchaseWizardController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

// Match party by GSTIN
const matchPartyByGSTIN = async (companyId, gstin) => {
  if (!gstin) return null;
  const parties = await findAllParties(companyId);
  return parties.find((p) => p.gst?.gstin === gstin) || null;
};

// Check for duplicate invoice
const checkDuplicateInvoice = async (companyId, invoiceNumber, partyId) => {
  const { readAccountingCollection } = await import("../../storage/accountingStore.js");
  const purchases = await readAccountingCollection(companyId, "purchases", "vouchers");
  return purchases.find(
    (p) => p.invoiceNumber === invoiceNumber && p.partyId === partyId
  );
};

export const createPurchaseWizard = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const {
    gstin,
    partyId,
    invoiceNumber,
    invoiceDate,
    date,
    items,
    additionalCosts = [],
    createReceiptNote = false,
    trackingNo = null,
    reverseCharge = false,
    itcEligible = true,
    remarks = "",
    gstrData = null, // Optional: GST 2B/2A mapped data
  } = req.body;

  if (!companyId || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "companyId, date, and items array are required",
    });
  }

  // 1. Match or validate party
  let finalPartyId = partyId;
  if (!finalPartyId && gstin) {
    const matchedParty = await matchPartyByGSTIN(companyId, gstin);
    if (matchedParty) {
      finalPartyId = matchedParty.id;
    } else {
      return res.status(404).json({
        message: `Party not found for GSTIN: ${gstin}. Please create party first.`,
      });
    }
  }

  if (!finalPartyId) {
    return res.status(400).json({
      message: "partyId or gstin is required",
    });
  }

  const party = await findPartyById(companyId, finalPartyId);
  if (!party) {
    return res.status(404).json({ message: "Party not found" });
  }

  // 2. Check duplicate invoice
  if (invoiceNumber) {
    const duplicate = await checkDuplicateInvoice(companyId, invoiceNumber, finalPartyId);
    if (duplicate) {
      return res.status(400).json({
        message: `Invoice ${invoiceNumber} already exists for this party`,
      });
    }
  }

  // 3. Validate items and map to inventory items
  const validatedItems = [];
  let totalPurchaseAmount = 0;

  for (const item of items) {
    if (!item.itemId || !item.godownId || item.qty === undefined || item.rate === undefined) {
      return res.status(400).json({
        message: "Each item must have itemId, godownId, qty, and rate",
      });
    }

    const stockItem = await getStockItemById(companyId, item.itemId);
    if (!stockItem) {
      return res.status(404).json({ message: `Stock item ${item.itemId} not found` });
    }

    const godown = await getGodownById(companyId, item.godownId);
    if (!godown) {
      return res.status(404).json({ message: `Godown ${item.godownId} not found` });
    }

    const itemAmount = Math.abs(item.qty) * item.rate;
    totalPurchaseAmount += itemAmount;

    validatedItems.push({
      itemId: item.itemId,
      godownId: item.godownId,
      batchId: item.batchId || null,
      qty: Math.abs(item.qty),
      rate: item.rate,
      amount: itemAmount,
      hsn: item.hsn || stockItem.gst?.hsn || "",
      gstRate: item.gstRate || 0,
    });
  }

  // 4. Apply additional costs (quantity or value-based allocation)
  let totalAdditionalCosts = 0;
  const costAllocations = [];

  for (const cost of additionalCosts) {
    const costAmount = cost.amount || 0;
    totalAdditionalCosts += costAmount;

    if (cost.allocationMethod === "QUANTITY") {
      const totalQty = validatedItems.reduce((sum, it) => sum + it.qty, 0);
      if (totalQty > 0) {
        for (const item of validatedItems) {
          const allocated = (item.qty / totalQty) * costAmount;
          item.rate += allocated / item.qty;
          item.amount += allocated;
          costAllocations.push({
            costType: cost.type || "OTHER",
            itemId: item.itemId,
            allocated,
          });
        }
      }
    } else if (cost.allocationMethod === "VALUE") {
      if (totalPurchaseAmount > 0) {
        for (const item of validatedItems) {
          const allocated = (item.amount / totalPurchaseAmount) * costAmount;
          item.rate += allocated / item.qty;
          item.amount += allocated;
          costAllocations.push({
            costType: cost.type || "OTHER",
            itemId: item.itemId,
            allocated,
          });
        }
      }
    }
  }

  const finalPurchaseAmount = totalPurchaseAmount + totalAdditionalCosts;

  // 5. Generate voucher numbers
  const voucherNo = invoiceNumber || `PUR-${Date.now()}`;
  const voucherId = `PUR-${voucherNo}`;

  // 6. Create receipt note if requested
  let receiptNoteVoucher = null;
  let receiptNoteTrackingNo = trackingNo;

  if (createReceiptNote) {
    if (!receiptNoteTrackingNo) {
      receiptNoteTrackingNo = `RN-${Date.now()}`;
    }

    // Create tracking if it doesn't exist
    const existingTracking = await findByTrackingNo(companyId, receiptNoteTrackingNo);
    if (!existingTracking) {
      await createTracking(companyId, {
        trackingNo: receiptNoteTrackingNo,
        sourceVoucher: "RECEIPT_NOTE",
        targetVoucher: "PURCHASE",
        status: "OPEN",
        createdAt: new Date().toISOString(),
      });
    }

    const rnVoucherId = `RN-${voucherNo}`;
    const rnVoucher = {
      voucherId: rnVoucherId,
      voucherNo: `RN-${voucherNo}`,
      date,
      partyId: finalPartyId,
      items: validatedItems.map((item) => ({
        itemId: item.itemId,
        godownId: item.godownId,
        batchId: item.batchId || null,
        qty: item.qty,
        rate: item.rate,
      })),
      trackingNo: receiptNoteTrackingNo,
      remarks: `Auto-generated for ${voucherId}`,
      createdAt: new Date().toISOString(),
    };

    const rnTransactions = validatedItems.map((item) =>
      createTransaction(
        companyId,
        {
          voucherType: "RECEIPT_NOTE",
          voucherId: rnVoucherId,
          date,
          trackingNo: receiptNoteTrackingNo,
        },
        {
          itemId: item.itemId,
          godownId: item.godownId,
          batchId: item.batchId || null,
          qty: item.qty,
          rate: item.rate,
        }
      )
    );

    await saveVoucherWithTransactions(companyId, "receiptNotes", rnVoucher, rnTransactions);
    receiptNoteVoucher = rnVoucher;
  }

  // 7. Create purchase voucher
  const purchaseVoucher = {
    voucherId,
    voucherNo,
    date: invoiceDate || date,
    partyId: finalPartyId,
    invoiceNumber: invoiceNumber || voucherNo,
    items: validatedItems.map((item) => ({
      itemId: item.itemId,
      godownId: item.godownId,
      batchId: item.batchId || null,
      qty: item.qty,
      rate: item.rate,
    })),
    trackingNo: receiptNoteTrackingNo,
    remarks,
    createdAt: new Date().toISOString(),
  };

  // Create purchase transactions (if not already created by receipt note)
  let purchaseTransactions = [];
  if (!createReceiptNote) {
    purchaseTransactions = validatedItems.map((item) =>
      createTransaction(
        companyId,
        {
          voucherType: "PURCHASE",
          voucherId,
          date,
          trackingNo: null,
        },
        {
          itemId: item.itemId,
          godownId: item.godownId,
          batchId: item.batchId || null,
          qty: item.qty,
          rate: item.rate,
        }
      )
    );
    await saveVoucherWithTransactions(companyId, "purchaseVouchers", purchaseVoucher, purchaseTransactions);
  } else {
    await appendVoucher(companyId, "purchaseVouchers", purchaseVoucher);
  }

  // 8. Create accounting voucher
  const accountingVoucher = {
    voucherId,
    voucherType: "PURCHASE",
    date: invoiceDate || date,
    partyId: finalPartyId,
    partyName: party.name || "",
    invoiceNumber: invoiceNumber || voucherNo,
    totalAmount: finalPurchaseAmount,
    items: validatedItems,
    additionalCosts: costAllocations,
    gst: {
      reverseCharge,
      itcEligible,
      ...(gstrData || {}),
    },
    partyGst: party.gst || {},
    createdAt: new Date().toISOString(),
  };

  await appendAccountingVoucher(companyId, "purchases", accountingVoucher);

  // 9. Create outstanding bill
  if (party.billByBillEnabled !== false) {
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + (party.defaultCreditPeriodDays || 0));

    await createOutstanding(companyId, {
      partyId: finalPartyId,
      voucherId,
      voucherType: "PURCHASE",
      date: invoiceDate || date,
      dueDate: dueDate.toISOString().split("T")[0],
      originalAmount: finalPurchaseAmount,
      balance: finalPurchaseAmount,
      isCredit: false,
    });
  }

  return res.status(201).json({
    success: true,
    receiptNote: receiptNoteVoucher,
    purchaseVoucher,
    accountingVoucher,
    totalAmount: finalPurchaseAmount,
    additionalCosts: totalAdditionalCosts,
    transactions: purchaseTransactions,
  });
});


