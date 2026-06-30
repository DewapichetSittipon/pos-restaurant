import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { MAX_IMAGE_BYTES, type UploadedImageFile } from '../uploads/uploads.constants';

// onboarding ของร้านที่เพิ่งสมัคร (pending) — เลือกแพ็กเกจ + อัปสลิป ก่อน admin อนุมัติ
// **ไม่มี ActiveShopGuard** เพราะร้าน pending ต้องเข้าได้ (ยังไม่ active)
@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  status(@CurrentShop() shopId: number) {
    return this.onboarding.getStatus(shopId);
  }

  // multipart: field "slip" (รูปสลิป) + "planKey" (text)
  @Post('submit')
  @UseInterceptors(
    FileInterceptor('slip', { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  submit(
    @CurrentShop() shopId: number,
    @Body('planKey') planKey: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.onboarding.submit(shopId, planKey, file);
  }
}
