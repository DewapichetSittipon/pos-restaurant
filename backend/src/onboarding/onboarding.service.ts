import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../uploads/storage.service';
import { NotificationService } from '../notifications/notification.service';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MIME_EXT,
  type UploadedImageFile,
} from '../uploads/uploads.constants';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notify: NotificationService,
  ) {}

  // สถานะ onboarding ของร้าน + แพ็กเกจให้เลือก + PromptPay ของแพลตฟอร์ม (โอนเงิน)
  async getStatus(shopId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        status: true,
        requestedPlanKey: true,
        paymentSlipUrl: true,
      },
    });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      shopStatus: shop.status,
      requestedPlanKey: shop.requestedPlanKey,
      paymentSlipUrl: shop.paymentSlipUrl,
      // เบอร์/เลข PromptPay ของแพลตฟอร์ม (ตั้งใน env) — null = ยังไม่ตั้ง (FE โชว์ข้อความติดต่อแอดมิน)
      platformPromptPay: process.env.PLATFORM_PROMPTPAY ?? null,
      plans: plans.map((p) => ({
        key: p.key,
        name: p.name,
        priceMonthly: p.priceMonthly,
        features: p.features,
        maxStaff: p.maxStaff,
        maxTable: p.maxTable,
        maxMenu: p.maxMenu,
      })),
    };
  }

  // ร้านเลือกแพ็กเกจ + อัปโหลดสลิป (บังคับมีสลิป) — ตั้ง requestedPlanKey ไว้ให้ admin ตรวจ
  async submit(shopId: number, planKey: string, file?: UploadedImageFile) {
    const plan = await this.prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan || !plan.isActive) {
      throw new BadRequestException('ไม่พบแพ็กเกจที่เลือก');
    }
    if (!file) {
      throw new BadRequestException('ต้องแนบสลิปการโอนเงิน');
    }
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      throw new BadRequestException('รองรับเฉพาะรูป JPG, PNG, WebP');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('ไฟล์ใหญ่เกิน 2MB');
    }

    const path = `slips/${shopId}-${Date.now()}.${MIME_EXT[file.mimetype]}`;
    const url = await this.storage.upload(path, file.buffer, file.mimetype);

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, paymentSlipUrl: true },
    });
    await this.storage.remove(shop?.paymentSlipUrl ?? null); // ลบสลิปเก่า (ถ้าส่งซ้ำ)

    await this.prisma.shop.update({
      where: { id: shopId },
      data: { requestedPlanKey: plan.key, paymentSlipUrl: url },
    });

    // แจ้งผู้ดูแลแพลตฟอร์ม (best-effort)
    void this.notify.notify(
      '💳 ร้านส่งสลิปสมัครแพ็กเกจ',
      `ร้าน "${shop?.name}" เลือกแพ็กเกจ "${plan.name}" + แนบสลิปแล้ว — ตรวจและอนุมัติที่ /platform`,
    );

    return this.getStatus(shopId);
  }
}
