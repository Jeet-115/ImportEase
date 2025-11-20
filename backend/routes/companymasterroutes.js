import { Router } from "express";
import {
  createCompanyMaster,
  getCompanyMasters,
  getCompanyMasterById,
  updateCompanyMaster,
  deleteCompanyMaster,
} from "../controllers/companymastercontroller.js";

const router = Router();

router.route("/").get(getCompanyMasters).post(createCompanyMaster);

router
  .route("/:id")
  .get(getCompanyMasterById)
  .put(updateCompanyMaster)
  .delete(deleteCompanyMaster);

export default router;

