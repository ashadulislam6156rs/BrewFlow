import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateProgramInput,
  UpdateProgramInput,
  EnrollCustomerInput,
  EarnPointsInput,
  RedeemPointsInput,
  AdjustPointsInput,
  ListAccountsQuery,
} from "./loyalty.validation.js";
import { Prisma } from "@prisma/client";

export class LoyaltyService {
  // ─── Programs ────────────────────────────────────────────
  async createProgram(organizationId: string, input: CreateProgramInput) {
    return prisma.loyaltyProgram.create({
      data: {
        organizationId,
        name: input.name,
        pointsPerAmount: input.pointsPerAmount ?? 1,
        amountPerPoint: input.amountPerPoint ?? 1,
        minimumRedeemPoints: input.minimumRedeemPoints ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  async listPrograms(organizationId: string) {
    return prisma.loyaltyProgram.findMany({
      where: { organizationId },
      include: {
        _count: { select: { accounts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateProgram(
    organizationId: string,
    id: string,
    input: UpdateProgramInput
  ) {
    const program = await prisma.loyaltyProgram.findFirst({
      where: { id, organizationId },
    });
    if (!program) throw new NotFoundError("Loyalty program not found");

    return prisma.loyaltyProgram.update({
      where: { id },
      data: input,
    });
  }

  async getActiveProgram(organizationId: string) {
    const program = await prisma.loyaltyProgram.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!program) throw new NotFoundError("No active loyalty program");
    return program;
  }

  // ─── Accounts ────────────────────────────────────────────
  async enroll(organizationId: string, input: EnrollCustomerInput) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) throw new BadRequestError("Customer not found");

    const existing = await prisma.loyaltyAccount.findUnique({
      where: { customerId: input.customerId },
    });
    if (existing) throw new ConflictError("Customer already enrolled in loyalty");

    let programId = input.programId;
    if (!programId) {
      const program = await this.getActiveProgram(organizationId);
      programId = program.id;
    } else {
      const program = await prisma.loyaltyProgram.findFirst({
        where: { id: programId, organizationId, isActive: true },
      });
      if (!program) throw new BadRequestError("Loyalty program not found or inactive");
    }

    return prisma.loyaltyAccount.create({
      data: {
        customerId: input.customerId,
        programId,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        program: {
          select: {
            id: true,
            name: true,
            pointsPerAmount: true,
            amountPerPoint: true,
            minimumRedeemPoints: true,
          },
        },
      },
    });
  }

  async getAccount(organizationId: string, customerId: string) {
    const account = await prisma.loyaltyAccount.findFirst({
      where: {
        customerId,
        customer: { organizationId },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        program: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!account) throw new NotFoundError("Loyalty account not found");
    return account;
  }

  async listAccounts(organizationId: string, query: ListAccountsQuery) {
    const { page, limit, programId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LoyaltyAccountWhereInput = {
      customer: { organizationId },
      ...(programId && { programId }),
      ...(search && {
        customer: {
          organizationId,
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { customerCode: { contains: search } },
          ],
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.loyaltyAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { pointsBalance: "desc" },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, customerCode: true },
          },
          program: { select: { id: true, name: true } },
        },
      }),
      prisma.loyaltyAccount.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Points ──────────────────────────────────────────────
  async earn(organizationId: string, input: EarnPointsInput) {
    const account = await this.ensureAccount(organizationId, input.customerId);
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: account.programId },
    });
    if (!program || !program.isActive) {
      throw new BadRequestError("Loyalty program is not active");
    }

    let points = Number(input.points ?? 0);
    if (input.orderAmount && !input.points) {
      points =
        Math.floor(
          Number(input.orderAmount) * Number(program.pointsPerAmount) * 100
        ) / 100;
    }
    if (points <= 0) throw new BadRequestError("Points must be positive");

    return prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "EARN",
          points,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          note: input.note,
        },
      });

      return tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: { increment: points },
          lifetimeEarned: { increment: points },
        },
        include: {
          customer: { select: { id: true, name: true } },
          program: { select: { id: true, name: true, amountPerPoint: true } },
        },
      });
    });
  }

  async redeem(organizationId: string, input: RedeemPointsInput) {
    const account = await this.ensureAccount(organizationId, input.customerId);
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: account.programId },
    });
    if (!program || !program.isActive) {
      throw new BadRequestError("Loyalty program is not active");
    }

    const points = Number(input.points);
    if (points < program.minimumRedeemPoints) {
      throw new BadRequestError(
        `Minimum redeem points is ${program.minimumRedeemPoints}`
      );
    }
    if (points > Number(account.pointsBalance)) {
      throw new BadRequestError("Insufficient points balance");
    }

    const discountValue =
      Math.round(points * Number(program.amountPerPoint) * 100) / 100;

    return prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "REDEEM",
          points: -points,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          note: input.note ?? `Redeemed ${points} points = ${discountValue}`,
        },
      });

      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: { decrement: points },
          lifetimeRedeemed: { increment: points },
        },
        include: {
          customer: { select: { id: true, name: true } },
          program: { select: { id: true, name: true, amountPerPoint: true } },
        },
      });

      return {
        ...updated,
        redeemedPoints: points,
        discountValue,
      };
    });
  }

  async adjust(organizationId: string, input: AdjustPointsInput) {
    const account = await this.ensureAccount(organizationId, input.customerId);
    const points = Number(input.points);

    if (points < 0 && Math.abs(points) > Number(account.pointsBalance)) {
      throw new BadRequestError("Cannot adjust below zero balance");
    }

    return prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "ADJUST",
          points,
          note: input.note ?? "Manual adjustment",
        },
      });

      return tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: { increment: points },
          ...(points > 0
            ? { lifetimeEarned: { increment: points } }
            : {}),
        },
        include: {
          customer: { select: { id: true, name: true } },
          program: { select: { id: true, name: true } },
        },
      });
    });
  }

  async listTransactions(
    organizationId: string,
    customerId: string,
    page = 1,
    limit = 50
  ) {
    const account = await this.ensureAccount(organizationId, customerId);

    const [items, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { accountId: account.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.loyaltyTransaction.count({ where: { accountId: account.id } }),
    ]);

    return { items, total, page, limit };
  }

  private async ensureAccount(organizationId: string, customerId: string) {
    const account = await prisma.loyaltyAccount.findFirst({
      where: {
        customerId,
        customer: { organizationId },
      },
    });
    if (!account) {
      throw new NotFoundError(
        "Customer is not enrolled in loyalty. Enroll first."
      );
    }
    return account;
  }
}

export const loyaltyService = new LoyaltyService();
