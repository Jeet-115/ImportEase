import { Router } from "express";
import {
  createSalesOrder,
  createPurchaseOrder,
  createJobOrder,
  updateOrder,
  precloseOrder,
  getPendingOrders,
  getAllOrders,
  getOrderById,
} from "./orderController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/sales", requireActiveSubscription, createSalesOrder);
router.post("/purchase", requireActiveSubscription, createPurchaseOrder);
router.post("/job", requireActiveSubscription, createJobOrder);
router.put("/:orderType/:orderId", requireActiveSubscription, updateOrder);
router.post("/:orderType/:orderId/preclose", requireActiveSubscription, precloseOrder);
router.get("/pending", requireActiveSubscription, getPendingOrders);
router.get("/", requireActiveSubscription, getAllOrders);
router.get("/:orderType/:orderId", requireActiveSubscription, getOrderById);

export default router;


