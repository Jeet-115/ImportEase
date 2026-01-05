import { Router } from "express";
import {
  getAllTransactions,
  getStock,
  getAllStock,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", getAllTransactions);
router.get("/stock", getStock);
router.get("/stock/all", getAllStock);

export default router;

