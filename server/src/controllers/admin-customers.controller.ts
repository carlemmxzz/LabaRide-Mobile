import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { Server } from 'socket.io';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';

const customerWhere = { isAdmin: false, isShopOwner: false, isRider: false, riderProfile: { is: null } } as const;
const customerSelect = { id: true, name: true, email: true, phone: true, createdAt: true, isBlocked: true, blockReason: true, blockedAt: true, accessVersion: true } as const;
const listSchema = z.object({ search: z.string().trim().max(200).default(''), status: z.enum(['All', 'Active', 'Blocked']).default('All'), page: z.coerce.number().int().min(1).max(100000).default(1) });
const accessSchema = z.object({ params: z.object({ userId: z.coerce.number().int().positive() }), body: z.object({ blocked: z.boolean(), expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(5).max(1000) }).strict() });

export class AdminCustomersController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, status, page } = listSchema.parse(req.query);
      const where: Prisma.UserWhereInput = { ...customerWhere,
        ...(status !== 'All' ? { isBlocked: status === 'Blocked' } : {}),
        ...(search ? { OR: ['name', 'email', 'phone'].map(field => ({ [field]: { contains: search, mode: 'insensitive' } })) } : {}),
      };
      const [total, customers] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({ where, select: customerSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }),
      ]);
      res.setHeader('Cache-Control', 'private, no-store');
      return sendSuccess(res, { customers, total, page, pageSize: 20 });
    } catch (error) { next(error); }
  }
  static async access(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { params: { userId }, body } = accessSchema.parse(req);
      if (userId === req.user!.userId) return sendError(res, 'You cannot block your own account.', 'FORBIDDEN', 403);
      const customer = await prisma.$transaction(async tx => {
        const updated = await tx.user.updateMany({ where: { ...customerWhere, id: userId, accessVersion: body.expectedVersion, isBlocked: !body.blocked },
          data: { isBlocked: body.blocked, blockReason: body.blocked ? body.reason : null, blockedAt: body.blocked ? new Date() : null, accessVersion: { increment: 1 } } });
        if (!updated.count) return null;
        await tx.customerAccessReview.create({ data: { userId, actorId: req.user!.userId, blocked: body.blocked, reason: body.reason } });
        return tx.user.findUniqueOrThrow({ where: { id: userId }, select: customerSelect });
      });
      if (!customer) return sendError(res, 'Customer access changed or this account cannot be managed here. Refresh and try again.', 'CONFLICT', 409);
      if (body.blocked) {
        const io = req.app.get('io') as Server | undefined;
        if (io) for (const socket of await io.fetchSockets()) if (socket.data.userId === userId) socket.disconnect(true);
      }
      return sendSuccess(res, customer, body.blocked ? 'Customer blocked' : 'Customer unblocked');
    } catch (error) { next(error); }
  }
}
