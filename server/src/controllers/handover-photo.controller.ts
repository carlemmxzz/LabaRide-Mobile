import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Server } from 'socket.io';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response';
import { prepareShopPhoto } from '../utils/shop-photo';

const id = z.coerce.number().int().positive();
const input = z.object({ kind: z.enum(['CustomerPickup', 'ShopDropoff', 'ShopCollection', 'CustomerDelivery']), note: z.string().trim().max(500).default('') });
const metadata = { id: true, transactionId: true, assignmentId: true, riderId: true, kind: true, note: true, workflowStatus: true, createdAt: true } as const;
async function canRead(req: AuthRequest, transactionId: number) {
  const order = await prisma.transaction.findUnique({ where: { id: transactionId }, select: {
    userId: true, shop: { select: { userId: true } }, assignments: { where: { riderId: req.user!.userId, status: { in: ['Accepted', 'Completed'] } }, select: { id: true } },
  } });
  return !!order && (req.user!.isAdmin || order.userId === req.user!.userId || order.shop.userId === req.user!.userId || req.user!.isRider && order.assignments.length > 0);
}
export class HandoverPhotoController {
  static async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.isRider) return sendError(res, 'Rider access required', 'FORBIDDEN', 403);
      const assignmentId = id.parse(req.params.id), body = input.parse(req.body);
      const rider = await prisma.riderProfile.findUnique({ where: { userId: req.user.userId }, select: { active: true } });
      if (!rider?.active) return sendError(res, 'Active rider access required', 'FORBIDDEN', 403);
      const assignment = await prisma.deliveryAssignment.findUnique({ where: { id: assignmentId }, select: { transactionId: true, riderId: true } });
      if (!assignment || assignment.riderId !== req.user.userId) return sendError(res, 'Assignment not found', 'NOT_FOUND', 404);
      const bytes = await prepareShopPhoto(req.body);
      const result = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM transactions WHERE id = ${assignment.transactionId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM delivery_assignments WHERE id = ${assignmentId} FOR UPDATE`;
        const job = await tx.deliveryAssignment.findUnique({ where: { id: assignmentId }, include: { transaction: { select: { workflowStatus: true } } } });
        if (!job || job.riderId !== req.user!.userId || !['Accepted', 'Completed'].includes(job.status)
          || job.transaction.workflowStatus === 'Cancelled') return null;
        const allowed = job.stage === 'Pickup' ? ['CustomerPickup', 'ShopDropoff'] : ['ShopCollection', 'CustomerDelivery'];
        if (!allowed.includes(body.kind)) throw Object.assign(new Error('Choose a handover type matching this pickup or delivery job.'), { statusCode: 400 });
        if (await tx.riderHandoverPhoto.count({ where: { assignmentId, kind: body.kind } }) >= 3) throw Object.assign(new Error('Up to three photos may be saved for each handover on this job.'), { statusCode: 409 });
        return tx.riderHandoverPhoto.create({ data: { assignmentId, transactionId: job.transactionId, riderId: req.user!.userId,
          kind: body.kind, note: body.note, bytes, workflowStatus: job.transaction.workflowStatus || '' }, select: metadata });
      });
      if (!result) return sendError(res, 'This job changed or no longer accepts photos. Refresh your jobs.', 'CONFLICT', 409);
      (req.app.get('io') as Server | undefined)?.emit('operations_update', {});
      return sendSuccess(res, result, 'Handover photo saved', 201);
    } catch (error) { next(error); }
  }
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const transactionId = id.parse(req.params.id);
      if (!await canRead(req, transactionId)) return sendError(res, 'Order photo access denied', 'FORBIDDEN', 403);
      res.setHeader('Cache-Control', 'private, no-store');
      return sendSuccess(res, await prisma.riderHandoverPhoto.findMany({ where: { transactionId }, select: metadata, orderBy: { createdAt: 'desc' } }));
    } catch (error) { next(error); }
  }
  static async image(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const transactionId = id.parse(req.params.id), photoId = id.parse(req.params.photoId);
      if (!await canRead(req, transactionId)) return sendError(res, 'Order photo access denied', 'FORBIDDEN', 403);
      const photo = await prisma.riderHandoverPhoto.findFirst({ where: { id: photoId, transactionId }, select: { bytes: true } });
      if (!photo) return sendError(res, 'Handover photo not found', 'NOT_FOUND', 404);
      res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(photo.bytes);
    } catch (error) { next(error); }
  }
}
