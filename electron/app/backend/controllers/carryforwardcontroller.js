import {
  readCollection,
} from "../storage/fileStore.js";
import {
  findById as findProcessedById,
  upsert as upsertProcessed,
} from "../models/processedfilemodel.js";
import {
  findById as findProcessed2AById,
  upsert as upsertProcessed2A,
} from "../models/processedfilemodel2a.js";
import {
  findById as findGstr2BImportById,
} from "../models/gstr2bimportmodel.js";
import {
  findById as findGstr2AImportById,
} from "../models/gstr2aimportmodel.js";
import { normalizeInvoiceNumber } from "./gstr2bimportcontroller.js";

/**
 * Normalizes an invoice number - same logic as in gstr2bimportcontroller
 * This is a re-export for use in this module
 */
const normalize = normalizeInvoiceNumber;

/**
 * Builds a composite key for duplicate detection
 * Format: normalize(invoiceNo)|gstin|amount
 */
const buildDuplicateKey = (row) => {
  // Get invoice number from various possible fields
  const invoiceNo = row?.vchNo || row?.invoiceNumber || row?.referenceNo || "";
  const normalizedInvoice = normalize(invoiceNo);
  
  // Get GSTIN from various possible fields
  const gstin = String(row?.gstinUin || row?.gstin || "").trim().toUpperCase();
  
  // Get amount - try multiple fields
  const amount = row?.supplierAmount || row?.invoiceAmount || row?.invoiceValue || 0;
  const amountStr = Number(amount).toFixed(2);
  
  return `${normalizedInvoice}|${gstin}|${amountStr}`;
};

/**
 * Extracts month and year from a date or date string
 * Returns { month, year } or null
 */
const extractMonthYear = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    
    return {
      month: date.getMonth() + 1, // 1-12
      year: date.getFullYear(),
    };
  } catch {
    return null;
  }
};

/**
 * Gets the month/year for a processed file
 * Tries multiple sources: processedAt, import createdAt, or extracts from first row's date
 */
const getProcessedFileMonthYear = (processedFile, importDoc) => {
  // Try processedAt
  if (processedFile?.processedAt) {
    const result = extractMonthYear(processedFile.processedAt);
    if (result) return result;
  }
  
  // Try import createdAt
  if (importDoc?.createdAt) {
    const result = extractMonthYear(importDoc.createdAt);
    if (result) return result;
  }
  
  // Try to extract from first row's date
  const firstRow = processedFile?.processedRows?.[0];
  if (firstRow) {
    const dateField = firstRow.date || firstRow.referenceDate || firstRow.invoiceDate;
    if (dateField) {
      // Try to parse DD/MM/YYYY format
      const dateMatch = String(dateField).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        return {
          month: parseInt(dateMatch[2], 10),
          year: parseInt(dateMatch[3], 10),
        };
      }
    }
  }
  
  return null;
};

/**
 * Checks if two month/year pairs represent the same month
 */
const isSameMonth = (my1, my2) => {
  if (!my1 || !my2) return false;
  return my1.month === my2.month && my1.year === my2.year;
};

/**
 * Gets all pending rows from historical processed files for a company and type
 * Excludes the current month's processed file
 */
export const getCarryForwardPending = async (companyId, type, currentProcessedId) => {
  try {
    // Determine which collection to use
    const collectionKey = type === "GSTR2A" ? "processedFiles2A" : "processedFiles";
    
    // Read all processed files
    const allProcessedFiles = await readCollection(collectionKey);
    
    // Get current processed file to determine its month/year
    let currentProcessedFile = null;
    let currentMonthYear = null;
    
    if (currentProcessedId) {
      if (type === "GSTR2A") {
        currentProcessedFile = await findProcessed2AById(currentProcessedId);
      } else {
        currentProcessedFile = await findProcessedById(currentProcessedId);
      }
      
      if (currentProcessedFile) {
        // Get import doc to help determine month/year
        let importDoc = null;
        try {
          if (type === "GSTR2A") {
            importDoc = await findGstr2AImportById(currentProcessedId);
          } else {
            importDoc = await findGstr2BImportById(currentProcessedId);
          }
        } catch (err) {
          console.warn("Could not fetch import doc for current processed file:", err);
        }
        
        currentMonthYear = getProcessedFileMonthYear(currentProcessedFile, importDoc);
      }
    }
    
    // Filter processed files by company
    // companyId can be in companySnapshot._id or we need to match by company name
    const companyProcessedFiles = allProcessedFiles.filter((pf) => {
      // Skip current processed file
      if (pf._id === currentProcessedId) return false;
      
      // Check companySnapshot._id (primary method)
      if (pf?.companySnapshot?._id === companyId) return true;
      
      // Fallback: check if company name matches (for backward compatibility)
      // This is less reliable but helps with older data
      const companyName = pf?.company || pf?.companySnapshot?.companyName || "";
      // We can't reliably match by name alone, so we'll skip this fallback
      // and rely on companySnapshot._id
      return false;
    });
    
    // Build set of existing keys in current processed file to exclude them
    const currentFileKeys = new Set();
    if (currentProcessedFile) {
      const currentRows = Array.isArray(currentProcessedFile.processedRows) 
        ? currentProcessedFile.processedRows 
        : [];
      
      for (const row of currentRows) {
        const key = buildDuplicateKey(row);
        currentFileKeys.add(key);
      }
    }
    
    // Collect all pending rows from historical files
    const pendingRowsMap = new Map(); // key -> row with metadata
    
    for (const processedFile of companyProcessedFiles) {
      // Get import doc to help determine month/year
      let importDoc = null;
      try {
        if (type === "GSTR2A") {
          importDoc = await findGstr2AImportById(processedFile._id);
        } else {
          importDoc = await findGstr2BImportById(processedFile._id);
        }
      } catch (err) {
        console.warn(`Could not fetch import doc for ${processedFile._id}:`, err);
      }
      
      const fileMonthYear = getProcessedFileMonthYear(processedFile, importDoc);
      
      // Skip if this is the current month
      if (currentMonthYear && fileMonthYear && isSameMonth(currentMonthYear, fileMonthYear)) {
        continue;
      }
      
      // Get all processed rows (main sheet)
      const processedRows = Array.isArray(processedFile.processedRows) 
        ? processedFile.processedRows 
        : [];
      
      // Filter for pending rows that haven't been carried forward
      const pendingRows = processedRows.filter((row) => {
        const action = row?.Action || row?.action;
        const isPending = action === "Pending" || action === "PENDING";
        const notCarriedForward = !row?.carryForwardedTo;
        return isPending && notCarriedForward;
      });
      
      // Add each pending row with metadata, but exclude if it already exists in current file
      for (const row of pendingRows) {
        const key = buildDuplicateKey(row);
        
        // Skip if this row already exists in the current file
        if (currentFileKeys.has(key)) {
          continue;
        }
        
        // Only keep the first occurrence of each key (deduplication across months)
        if (!pendingRowsMap.has(key)) {
          pendingRowsMap.set(key, {
            ...row,
            _originalMonth: fileMonthYear ? `${fileMonthYear.month}/${fileMonthYear.year}` : "Unknown",
            _originalProcessedId: processedFile._id,
          });
        }
      }
    }
    
    // Convert map to array
    const pendingRows = Array.from(pendingRowsMap.values());
    
    return pendingRows;
  } catch (error) {
    console.error("getCarryForwardPending Error:", error);
    throw error;
  }
};

/**
 * Adds selected pending rows to the current processed file
 * Performs duplicate detection before inserting
 * Marks original rows as carried forward in their source files
 */
export const applyCarryForward = async (currentProcessedId, rowsToAdd, type) => {
  try {
    // Get current processed file
    let currentProcessedFile = null;
    if (type === "GSTR2A") {
      currentProcessedFile = await findProcessed2AById(currentProcessedId);
    } else {
      currentProcessedFile = await findProcessedById(currentProcessedId);
    }
    
    if (!currentProcessedFile) {
      throw new Error("Current processed file not found");
    }
    
    // Get current month/year for carryForwardedTo tracking
    let currentMonthYear = null;
    let importDoc = null;
    try {
      if (type === "GSTR2A") {
        importDoc = await findGstr2AImportById(currentProcessedId);
      } else {
        importDoc = await findGstr2BImportById(currentProcessedId);
      }
    } catch (err) {
      console.warn("Could not fetch import doc for current processed file:", err);
    }
    currentMonthYear = getProcessedFileMonthYear(currentProcessedFile, importDoc);
    
    // Build set of existing keys in current file
    const existingKeys = new Set();
    const currentRows = Array.isArray(currentProcessedFile.processedRows) 
      ? currentProcessedFile.processedRows 
      : [];
    
    for (const row of currentRows) {
      const key = buildDuplicateKey(row);
      existingKeys.add(key);
    }
    
    // Filter rows to add - skip duplicates
    const rowsToInsert = [];
    const rowsToMarkAsCarriedForward = []; // Track which original rows need to be marked
    
    for (const row of rowsToAdd) {
      const key = buildDuplicateKey(row);
      
      if (!existingKeys.has(key)) {
        // Clean up metadata fields before inserting
        const cleanRow = { ...row };
        const originalProcessedId = cleanRow._originalProcessedId;
        delete cleanRow._originalMonth;
        delete cleanRow._originalProcessedId;
        
        // Ensure status is Pending
        cleanRow.Action = "Pending";
        cleanRow.action = "Pending";
        
        rowsToInsert.push(cleanRow);
        existingKeys.add(key); // Mark as added to prevent duplicates in same batch
        
        // Track this row for marking in original file (use original row data for matching)
        if (originalProcessedId) {
          rowsToMarkAsCarriedForward.push({
            key,
            originalProcessedId,
            originalRow: row, // Keep original row data for matching
          });
        }
      }
    }
    
    if (rowsToInsert.length === 0) {
      // No new rows to add
      return {
        ...currentProcessedFile,
        processedRows: currentRows,
      };
    }
    
    // Mark original rows as carried forward in their source files
    if (rowsToMarkAsCarriedForward.length > 0 && currentMonthYear) {
      // Group by original processed file ID
      const filesToUpdate = new Map();
      
      for (const { key, originalProcessedId, originalRow } of rowsToMarkAsCarriedForward) {
        if (!filesToUpdate.has(originalProcessedId)) {
          filesToUpdate.set(originalProcessedId, []);
        }
        filesToUpdate.get(originalProcessedId).push({ key, originalRow });
      }
      
      // Update each original processed file
      for (const [originalProcessedId, rowsToMark] of filesToUpdate.entries()) {
        try {
          // Get the original processed file
          let originalProcessedFile = null;
          if (type === "GSTR2A") {
            originalProcessedFile = await findProcessed2AById(originalProcessedId);
          } else {
            originalProcessedFile = await findProcessedById(originalProcessedId);
          }
          
          if (!originalProcessedFile) {
            console.warn(`Original processed file ${originalProcessedId} not found, skipping carry-forward marking`);
            continue;
          }
          
          // Build set of keys to mark
          const keysToMark = new Set(rowsToMark.map((r) => r.key));
          
          // Update rows in the original file
          const originalRows = Array.isArray(originalProcessedFile.processedRows) 
            ? originalProcessedFile.processedRows 
            : [];
          
          let fileUpdated = false;
          const updatedOriginalRows = originalRows.map((originalRow) => {
            // Only mark PENDING rows
            const action = originalRow?.Action || originalRow?.action;
            if (action !== "Pending" && action !== "PENDING") {
              return originalRow;
            }
            
            // Skip if already marked as carried forward
            if (originalRow?.carryForwardedTo) {
              return originalRow;
            }
            
            // Check if this row matches any row being carried forward using duplicate key
            const originalKey = buildDuplicateKey(originalRow);
            
            if (keysToMark.has(originalKey)) {
              fileUpdated = true;
              return {
                ...originalRow,
                carryForwardedTo: {
                  year: currentMonthYear.year,
                  month: currentMonthYear.month,
                  processedId: currentProcessedId,
                },
              };
            }
            
            return originalRow;
          });
          
          // Save the updated original file if changes were made
          if (fileUpdated) {
            const updatedOriginalFile = {
              ...originalProcessedFile,
              processedRows: updatedOriginalRows,
            };
            
            if (type === "GSTR2A") {
              await upsertProcessed2A(updatedOriginalFile);
            } else {
              await upsertProcessed(updatedOriginalFile);
            }
            
            console.log(`Marked ${rowsToMark.length} row(s) as carried forward in file ${originalProcessedId}`);
          }
        } catch (err) {
          console.error(`Failed to mark rows as carried forward in file ${originalProcessedId}:`, err);
          // Continue with other files even if one fails
        }
      }
    }
    
    // Add new rows to processedRows
    const updatedProcessedRows = [...currentRows, ...rowsToInsert];
    
    // Renumber rows
    const renumberedRows = updatedProcessedRows.map((row, idx) => ({
      ...row,
      slNo: idx + 1,
    }));
    
    // Update processed file
    const updated = {
      ...currentProcessedFile,
      processedRows: renumberedRows,
    };
    
    if (type === "GSTR2A") {
      await upsertProcessed2A(updated);
    } else {
      await upsertProcessed(updated);
    }
    
    return updated;
  } catch (error) {
    console.error("applyCarryForward Error:", error);
    throw error;
  }
};

/**
 * Express handler for GET /api/carry-forward/:companyId/:type
 * Returns pending rows from previous months
 */
export const getCarryForwardPendingRows = async (req, res) => {
  try {
    const { companyId, type } = req.params;
    const { currentProcessedId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    
    if (!type || (type !== "GSTR2A" && type !== "GSTR2B")) {
      return res.status(400).json({ message: "type must be GSTR2A or GSTR2B" });
    }
    
    const pendingRows = await getCarryForwardPending(
      companyId,
      type,
      currentProcessedId || null
    );
    
    return res.status(200).json({
      pendingRows,
    });
  } catch (error) {
    console.error("getCarryForwardPendingRows Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch pending carry-forward rows",
    });
  }
};

/**
 * Express handler for POST /api/carry-forward/apply
 * Adds selected pending rows to current month
 */
export const applyCarryForwardRows = async (req, res) => {
  try {
    const { currentProcessedId, rowsToAdd, type } = req.body;
    
    if (!currentProcessedId) {
      return res.status(400).json({ message: "currentProcessedId is required" });
    }
    
    if (!type || (type !== "GSTR2A" && type !== "GSTR2B")) {
      return res.status(400).json({ message: "type must be GSTR2A or GSTR2B" });
    }
    
    if (!Array.isArray(rowsToAdd)) {
      return res.status(400).json({ message: "rowsToAdd must be an array" });
    }
    
    const updated = await applyCarryForward(
      currentProcessedId,
      rowsToAdd,
      type
    );
    
    return res.status(200).json({
      message: "Carry-forward rows added successfully",
      processed: updated,
    });
  } catch (error) {
    console.error("applyCarryForwardRows Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to apply carry-forward rows",
    });
  }
};

