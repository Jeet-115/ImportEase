import dotenv from "dotenv";
import { initFileStore } from "../storage/fileStore.js";
import { ensureGSTINSeeded } from "../controllers/gstinnumbercontroller.js";
import { processAllImports } from "../utils/gstr2bProcessor.js";

dotenv.config();

const run = async () => {
  try {
    await initFileStore();
    await ensureGSTINSeeded();
    await processAllImports();
    console.log("Processing completed");
  } catch (error) {
    console.error("Error processing GSTR-2B imports:", error);
  }
};

run();

