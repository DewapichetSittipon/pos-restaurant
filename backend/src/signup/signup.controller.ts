import { Body, Controller, Post } from '@nestjs/common';
import { SignupService } from './signup.service';
import { SignupDto } from './dto/signup.dto';

@Controller('signup')
export class SignupController {
  constructor(private readonly signup: SignupService) {}

  // public — ร้านสมัครเปิดร้านเอง (ไม่ต้อง login)
  @Post()
  register(@Body() dto: SignupDto) {
    return this.signup.register(dto);
  }
}
