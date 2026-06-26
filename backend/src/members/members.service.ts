import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  list(shopId: number) {
    return this.prisma.member.findMany({
      where: { shopId },
      orderBy: { points: 'desc' },
      take: 200,
    });
  }

  // ค้นหาสมาชิกจากเบอร์ (สำหรับตอนเช็คบิล) — null ถ้าไม่พบ
  findByPhone(shopId: number, phone: string) {
    return this.prisma.member.findUnique({
      where: { shopId_phone: { shopId, phone: phone.trim() } },
    });
  }

  async create(shopId: number, phone: string, name?: string) {
    try {
      return await this.prisma.member.create({
        data: { shopId, phone: phone.trim(), name: name?.trim() || null },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('มีสมาชิกเบอร์นี้อยู่แล้ว');
      }
      throw err;
    }
  }
}
