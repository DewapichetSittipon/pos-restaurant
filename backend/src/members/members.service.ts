import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// แปลง 'YYYY-MM-DD' → Date (UTC midnight) เพื่อเทียบ วัน/เดือน แบบคงที่
function parseBirthDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

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

  async create(shopId: number, phone: string, name?: string, birthDate?: string) {
    try {
      return await this.prisma.member.create({
        data: {
          shopId,
          phone: phone.trim(),
          name: name?.trim() || null,
          birthDate: parseBirthDate(birthDate) ?? null,
        },
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

  async update(
    shopId: number,
    id: number,
    data: { name?: string; birthDate?: string },
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id, shopId },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('ไม่พบสมาชิก');
    return this.prisma.member.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() || null : undefined,
        birthDate: parseBirthDate(data.birthDate),
      },
    });
  }
}
