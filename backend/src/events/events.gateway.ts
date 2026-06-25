import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { parse as parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { SocketEvent, socketRooms } from './socket.constants';

// Socket.io = push อย่างเดียว (server -> client). ดู ADR-0006
// - staff: ยืนยันด้วย JWT cookie -> join ห้องของร้าน staff:{shopId}
// - customer: ส่ง qr_token ผ่าน handshake.auth.token -> join table:{billId}
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    // 1) ลองเป็น customer ก่อน (มี token ใน handshake.auth)
    const qrToken = client.handshake.auth?.token as string | undefined;
    if (qrToken) {
      const bill = await this.prisma.bill.findFirst({
        where: { qrToken, status: 'pending' },
        select: { id: true },
      });
      if (bill) {
        await client.join(socketRooms.table(bill.id));
        this.logger.log(`customer joined ${socketRooms.table(bill.id)}`);
        return;
      }
      client.disconnect(true);
      return;
    }

    // 2) ไม่งั้นเป็น staff (JWT จาก cookie)
    const cookies = parseCookie(client.handshake.headers.cookie ?? '');
    const token = cookies[ACCESS_TOKEN_COOKIE];
    if (token) {
      try {
        const payload = this.jwt.verify<JwtPayload>(token);
        const room = socketRooms.staff(payload.shopId);
        await client.join(room);
        this.logger.log(`staff(${payload.username}) joined ${room}`);
        return;
      } catch {
        // token เสีย -> ตัดการเชื่อมต่อ
      }
    }

    client.disconnect(true);
  }

  // ---- push helpers (เรียกจาก service ต่างๆ) ----
  emitToTable(billId: number, event: SocketEvent, payload: unknown): void {
    this.server.to(socketRooms.table(billId)).emit(event, payload);
  }

  // ส่งให้ staff ทุกคนของร้าน (รวมจอครัว+หน้าร้าน)
  emitToShop(shopId: number, event: SocketEvent, payload: unknown): void {
    this.server.to(socketRooms.staff(shopId)).emit(event, payload);
  }
}
