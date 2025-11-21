import express from "express";
import {
  createLedgerName,
  deleteLedgerName,
  getLedgerNames,
  updateLedgerName,
} from "../controllers/ledgernamecontroller.js";

const router = express.Router();

router.get("/", getLedgerNames);
router.post("/", createLedgerName);
router.put("/:id", updateLedgerName);
router.delete("/:id", deleteLedgerName);

export default router;

