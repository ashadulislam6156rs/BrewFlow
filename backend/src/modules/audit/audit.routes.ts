import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { listAuditLogs } from "./audit.controller.js";
import { listAuditQuerySchema } from "./audit.validation.js";

const router = Router();
router.use(authenticate);
router.use(authorize("Owner", "Admin"));

router.get("/", validate(listAuditQuerySchema, "query"), listAuditLogs);

export default router;
