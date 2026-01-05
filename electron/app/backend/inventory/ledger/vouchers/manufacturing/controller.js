import { v4 as uuidv4 } from "uuid";
import { saveVoucherWithTransactions, createTransaction } from "../helpers.js";
import { getStockItemById } from "../../../items/model.js";
import { getGodownById } from "../../../godowns/model.js";
import { findById as findBOMById } from "../../../boms/model.js";
import { computeStock } from "../../transactions/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[ManufacturingController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const createManufacturing = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { voucherNo, date, bomId, finishedGoods, components, byProducts, scrap, costTrackId, remarks } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!voucherNo || !date || !finishedGoods) {
    return res.status(400).json({ message: "voucherNo, date, and finishedGoods are required" });
  }

  if (!finishedGoods.itemId || !finishedGoods.godownId || !finishedGoods.qty) {
    return res.status(400).json({ message: "finishedGoods must have itemId, godownId, and qty" });
  }

  // Validate BOM if provided
  if (bomId) {
    const bom = await findBOMById(companyId, bomId);
    if (!bom) {
      return res.status(400).json({ message: `BOM ${bomId} not found` });
    }
  }

  // Validate finished goods
  const fgItem = await getStockItemById(companyId, finishedGoods.itemId);
  if (!fgItem) {
    return res.status(400).json({ message: `Finished goods item ${finishedGoods.itemId} not found` });
  }

  const fgGodown = await getGodownById(companyId, finishedGoods.godownId);
  if (!fgGodown) {
    return res.status(400).json({ message: `Finished goods godown ${finishedGoods.godownId} not found` });
  }

  // Validate and check stock for components
  if (components && Array.isArray(components)) {
    for (const component of components) {
      if (!component.itemId || !component.godownId || !component.qty) {
        return res.status(400).json({ message: "Each component must have itemId, godownId, and qty" });
      }

      const componentItem = await getStockItemById(companyId, component.itemId);
      if (!componentItem) {
        return res.status(400).json({ message: `Component item ${component.itemId} not found` });
      }

      const componentGodown = await getGodownById(companyId, component.godownId);
      if (!componentGodown) {
        return res.status(400).json({ message: `Component godown ${component.godownId} not found` });
      }

      // Check stock availability
      const availableStock = await computeStock(
        companyId,
        component.itemId,
        component.godownId,
        component.batchId || null
      );

      if (availableStock < Math.abs(component.qty)) {
        return res.status(400).json({
          message: `Insufficient stock for component ${component.itemId} in godown ${component.godownId}. Available: ${availableStock}, Required: ${Math.abs(component.qty)}`,
        });
      }
    }
  }

  // Validate by-products and scrap
  if (byProducts && Array.isArray(byProducts)) {
    for (const bp of byProducts) {
      if (!bp.itemId || !bp.godownId || !bp.qty) {
        return res.status(400).json({ message: "Each by-product must have itemId, godownId, and qty" });
      }
      await getStockItemById(companyId, bp.itemId);
      await getGodownById(companyId, bp.godownId);
    }
  }

  if (scrap && Array.isArray(scrap)) {
    for (const s of scrap) {
      if (!s.itemId || !s.godownId || !s.qty) {
        return res.status(400).json({ message: "Each scrap must have itemId, godownId, and qty" });
      }
      await getStockItemById(companyId, s.itemId);
      await getGodownById(companyId, s.godownId);
    }
  }

  const voucherId = `MFG-${voucherNo}`;
  const voucher = {
    voucherId,
    voucherNo,
    date,
    bomId: bomId || null,
    finishedGoods,
    components: components || [],
    byProducts: byProducts || [],
    scrap: scrap || [],
    costTrackId: costTrackId || null,
    remarks: remarks || null,
    createdAt: new Date().toISOString(),
  };

  // Create transactions
  const transactions = [];

  // Components: negative qty (consumed)
  if (components) {
    for (const component of components) {
      transactions.push(
        createTransaction(
          companyId,
          {
            voucherType: "MANUFACTURING",
            voucherId,
            date,
            trackingNo: null,
          },
          {
            ...component,
            qty: -Math.abs(component.qty),
          }
        )
      );
    }
  }

  // Finished Goods: positive qty (produced)
  transactions.push(
    createTransaction(
      companyId,
      {
        voucherType: "MANUFACTURING",
        voucherId,
        date,
        trackingNo: null,
      },
      {
        ...finishedGoods,
        qty: Math.abs(finishedGoods.qty),
      }
    )
  );

  // By-Products: positive qty (produced)
  if (byProducts) {
    for (const bp of byProducts) {
      transactions.push(
        createTransaction(
          companyId,
          {
            voucherType: "MANUFACTURING",
            voucherId,
            date,
            trackingNo: null,
          },
          {
            ...bp,
            qty: Math.abs(bp.qty),
          }
        )
      );
    }
  }

  // Scrap: positive qty (produced)
  if (scrap) {
    for (const s of scrap) {
      transactions.push(
        createTransaction(
          companyId,
          {
            voucherType: "MANUFACTURING",
            voucherId,
            date,
            trackingNo: null,
          },
          {
            ...s,
            qty: Math.abs(s.qty),
          }
        )
      );
    }
  }

  await saveVoucherWithTransactions(companyId, "manufacturing", voucher, transactions);

  return res.status(201).json({ voucher, transactions });
});

