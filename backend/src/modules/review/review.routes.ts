import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createReview,
  listReviews,
  getReview,
  updateReviewStatus,
  deleteReview,
  productReviewSummary,
} from "./review.controller.js";
import {
  createReviewSchema,
  updateReviewStatusSchema,
  listReviewsQuerySchema,
  idParamSchema,
} from "./review.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

router.get("/", validate(listReviewsQuerySchema, "query"), listReviews);
router.post("/", validate(createReviewSchema), createReview);
router.get(
  "/product/:productId/summary",
  validate(z.object({ productId: z.string().cuid() }), "params"),
  productReviewSummary
);
router.get("/:id", validate(idParamSchema, "params"), getReview);
router.patch(
  "/:id/status",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateReviewStatusSchema),
  updateReviewStatus
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteReview
);

export default router;
