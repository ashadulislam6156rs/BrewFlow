import type { Request, Response } from "express";
import { loyaltyService } from "./loyalty.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateProgramInput,
  UpdateProgramInput,
  EnrollCustomerInput,
  EarnPointsInput,
  RedeemPointsInput,
  AdjustPointsInput,
  ListAccountsQuery,
} from "./loyalty.validation.js";

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.createProgram(
    req.user!.organizationId,
    req.body as CreateProgramInput
  );
  return sendSuccess(res, result, "Loyalty program created", 201);
});

export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.listPrograms(req.user!.organizationId);
  return sendSuccess(res, result, "Loyalty programs fetched");
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.updateProgram(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateProgramInput
  );
  return sendSuccess(res, result, "Loyalty program updated");
});

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.enroll(
    req.user!.organizationId,
    req.body as EnrollCustomerInput
  );
  return sendSuccess(res, result, "Customer enrolled in loyalty", 201);
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.getAccount(
    req.user!.organizationId,
    req.params.customerId
  );
  return sendSuccess(res, result, "Loyalty account fetched");
});

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListAccountsQuery;
  const { items, total, page, limit } = await loyaltyService.listAccounts(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Loyalty accounts fetched");
});

export const earn = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.earn(
    req.user!.organizationId,
    req.body as EarnPointsInput
  );
  return sendSuccess(res, result, "Points earned");
});

export const redeem = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.redeem(
    req.user!.organizationId,
    req.body as RedeemPointsInput
  );
  return sendSuccess(res, result, "Points redeemed");
});

export const adjust = asyncHandler(async (req: Request, res: Response) => {
  const result = await loyaltyService.adjust(
    req.user!.organizationId,
    req.body as AdjustPointsInput
  );
  return sendSuccess(res, result, "Points adjusted");
});

export const listTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { items, total } = await loyaltyService.listTransactions(
      req.user!.organizationId,
      req.params.customerId,
      page,
      limit
    );
    return sendPaginated(
      res,
      items,
      total,
      page,
      limit,
      "Loyalty transactions fetched"
    );
  }
);
