import { findAll as findAllOutstanding, updateInterest, updateBalance } from "../outstanding/outstandingModel.js";
import { findById as findPartyById } from "../masters/partyModel.js";
import { appendAccountingVoucher } from "../../storage/accountingStore.js";

// Calculate interest for a single bill based on party slabs
const calculateInterest = (bill, party, asOfDate) => {
  if (!party.interestEnabled || !party.interestConfig) {
    return 0;
  }

  const dueDate = new Date(bill.dueDate);
  const currentDate = new Date(asOfDate);
  const daysOverdue = Math.max(0, Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24)));

  if (daysOverdue <= 0) {
    return 0;
  }

  const config = party.interestConfig;
  const slabs = config.slabs || [];
  if (slabs.length === 0) {
    return 0;
  }

  // Sort slabs by fromDay
  const sortedSlabs = [...slabs].sort((a, b) => (a.fromDay || 0) - (b.fromDay || 0));

  let totalInterest = 0;
  let remainingDays = daysOverdue;
  let currentDay = 0;

  for (const slab of sortedSlabs) {
    const fromDay = slab.fromDay || 0;
    const toDay = slab.toDay || Infinity;
    const rate = Number(slab.rate || 0) / 100; // Convert percentage to decimal
    const appliesOn = slab.appliesOn || "DEBIT";

    // Check if this slab applies
    if (appliesOn === "CREDIT" && !bill.isCredit) continue;
    if (appliesOn === "DEBIT" && bill.isCredit) continue;
    if (appliesOn !== "BOTH" && appliesOn !== "DEBIT" && appliesOn !== "CREDIT") continue;

    if (currentDay < fromDay) {
      currentDay = fromDay;
    }

    if (currentDay >= toDay) {
      continue;
    }

    const daysInSlab = Math.min(remainingDays, toDay - currentDay);
    if (daysInSlab <= 0) break;

    // Calculate interest for this slab
    const principal = bill.balance || bill.originalAmount || 0;
    const interestForSlab = (principal * rate * daysInSlab) / 365;

    // Apply rounding
    if (slab.rounding === "UP") {
      totalInterest += Math.ceil(interestForSlab);
    } else if (slab.rounding === "DOWN") {
      totalInterest += Math.floor(interestForSlab);
    } else {
      totalInterest += Math.round(interestForSlab);
    }

    remainingDays -= daysInSlab;
    currentDay += daysInSlab;

    if (remainingDays <= 0) break;
  }

  return totalInterest;
};

// Run interest calculation for all outstanding bills
export const runInterestCalculation = async (companyId, asOfDate = new Date().toISOString().split("T")[0]) => {
  const allBills = await findAllOutstanding(companyId);
  const interestEntries = [];

  for (const bill of allBills) {
    if (bill.balance <= 0) continue; // Skip fully paid bills

    const party = await findPartyById(companyId, bill.partyId);
    if (!party || !party.interestEnabled) continue;

    const interestAccrued = calculateInterest(bill, party, asOfDate);
    if (interestAccrued <= 0) continue;

    // Update interest in outstanding
    await updateInterest(companyId, bill.voucherId, interestAccrued);

    // Create memo interest entry
    const interestEntry = {
      voucherId: `INT-${bill.voucherId}-${asOfDate}`,
      voucherType: "INTEREST_MEMO",
      date: asOfDate,
      partyId: bill.partyId,
      baseVoucherId: bill.voucherId,
      baseVoucherType: bill.voucherType,
      interestAmount: interestAccrued,
      daysOverdue: Math.floor(
        (new Date(asOfDate) - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24)
      ),
      status: "MEMO", // MEMO | POSTED
      createdAt: new Date().toISOString(),
    };

    await appendAccountingVoucher(companyId, "interest", interestEntry);
    interestEntries.push(interestEntry);
  }

  return interestEntries;
};

// Post interest (convert memo to actual debit/credit note)
export const postInterest = async (companyId, interestVoucherId, postAsDebitNote = true) => {
  const { readAccountingCollection, mutateAccountingCollection } = await import("../../storage/accountingStore.js");
  const interestEntries = await readAccountingCollection(companyId, "interest", "vouchers");

  const interestEntry = interestEntries.find((e) => e.voucherId === interestVoucherId);
  if (!interestEntry || interestEntry.status !== "MEMO") {
    throw new Error("Interest entry not found or already posted");
  }

  // Create debit/credit note
  const noteType = postAsDebitNote ? "DEBIT_NOTE" : "CREDIT_NOTE";
  const noteVoucherId = `${noteType}-${interestEntry.baseVoucherId}-INT`;

  const note = {
    voucherId: noteVoucherId,
    voucherType: noteType,
    date: new Date().toISOString().split("T")[0],
    partyId: interestEntry.partyId,
    baseVoucherId: interestEntry.baseVoucherId,
    amount: interestEntry.interestAmount,
    interestVoucherId: interestVoucherId,
    createdAt: new Date().toISOString(),
  };

  await appendAccountingVoucher(companyId, noteType.toLowerCase(), note);

  // Update outstanding balance
  await updateBalance(
    companyId,
    interestEntry.baseVoucherId,
    interestEntry.interestAmount,
    !postAsDebitNote // Credit note reduces, debit note increases
  );

  // Mark interest as posted
  await mutateAccountingCollection(companyId, "interest", (entries) => {
    const index = entries.findIndex((e) => e.voucherId === interestVoucherId);
    if (index === -1) return { nextData: entries, result: null, skipWrite: true };
    entries[index].status = "POSTED";
    entries[index].postedVoucherId = noteVoucherId;
    return { nextData: entries, result: entries[index] };
  }, "vouchers");

  return note;
};


