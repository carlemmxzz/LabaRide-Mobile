import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response';

export class InvoiceController {
  static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return sendError(res, 'Choose a valid order.', 'BAD_REQUEST', 400);
      const order = await prisma.transaction.findUnique({ where: { id }, include: {
        items: { select: { itemName: true, quantity: true } },
        shop: { select: { userId: true, approvalStatus: true, shopName: true, address: true, address_line_1: true, city: true, state_province: true, contactNumber: true } },
        assignments: { select: { riderId: true, status: true } },
      } });
      if (!order) return sendError(res, 'Order not found.', 'NOT_FOUND', 404);
      const actor = req.user!;
      const owner = actor.isShopOwner && order.shop.userId === actor.userId && order.shop.approvalStatus === 'Approved';
      const rider = actor.isRider && order.assignments.some(job => job.riderId === actor.userId && ['Accepted', 'Completed'].includes(job.status));
      if (!actor.isAdmin && order.userId !== actor.userId && !owner && !rider) return sendError(res, 'You cannot view this invoice.', 'FORBIDDEN', 403);
      res.setHeader('Cache-Control', 'private, no-store');
      return sendSuccess(res, {
        number: `LR-${String(order.id).padStart(6, '0')}`, orderId: order.id, createdAt: order.createdAt,
        updatedAt: order.updatedAt, status: order.workflowStatus || order.status, currency: 'PHP',
        customer: { name: order.userName },
        shop: { name: order.shop.shopName, address: order.shop.address || [order.shop.address_line_1, order.shop.city, order.shop.state_province].filter(Boolean).join(', '), phone: order.shop.contactNumber },
        serviceName: order.serviceName, kilos: order.kiloAmount.toFixed(2), items: order.items,
        subtotal: order.subtotal.toFixed(2), deliveryFee: order.deliveryFee.toFixed(2),
        discount: order.voucherDiscount.toFixed(2), total: order.totalAmount.toFixed(2), paymentMethod: order.paymentMethod,
      });
    } catch (error) { next(error); }
  }
}
