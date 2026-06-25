import { Injectable, NotFoundException } from '@nestjs/common';
import type { ServiceRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SocketEvent } from '../events/socket.constants';

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  // ลูกค้าเรียกพนักงาน/เช็คบิล -> เก็บลง DB + push staff ของร้าน (ServiceRequest entity)
  async create(shopId: number, billId: number, type: ServiceRequestType) {
    const sr = await this.prisma.serviceRequest.create({
      data: { billId, type },
      include: { bill: { include: { table: true } } },
    });
    this.events.emitToShop(shopId, SocketEvent.ServiceRequestCreated, sr);
    return sr;
  }

  // พนักงานรับเรื่อง (verify ว่าคำขอเป็นของร้านนี้)
  async acknowledge(shopId: number, id: number) {
    const existing = await this.prisma.serviceRequest.findFirst({
      where: { id, bill: { shopId } },
    });
    if (!existing) {
      throw new NotFoundException('ไม่พบคำขอ');
    }
    const sr = await this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'acknowledged' },
    });
    this.events.emitToShop(shopId, SocketEvent.ServiceRequestAcknowledged, sr);
    this.events.emitToTable(sr.billId, SocketEvent.ServiceRequestAcknowledged, sr);
    return sr;
  }
}
