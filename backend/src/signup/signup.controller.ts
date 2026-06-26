import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SignupService } from './signup.service';
import { SignupDto } from './dto/signup.dto';

@Controller('signup')
export class SignupController {
  constructor(private readonly signup: SignupService) {}

  // public — ร้านสมัครเปิดร้านเอง (ไม่ต้อง login) — จำกัด 5 ครั้ง/นาที กันสแปม
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: SignupDto) {
    return this.signup.register(dto);
  }
}
