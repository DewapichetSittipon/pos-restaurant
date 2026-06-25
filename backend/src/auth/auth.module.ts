import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CustomerTokenGuard } from './customer-token.guard';

// Global เพื่อให้ guards/JwtService ใช้ได้ทุก module โดยไม่ต้อง import ซ้ำ
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
        // expiresIn ของ @nestjs/jwt เป็น template-literal type จึง cast จาก string ของ config
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '12h') as `${number}h`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, CustomerTokenGuard],
  exports: [JwtModule, JwtAuthGuard, CustomerTokenGuard],
})
export class AuthModule {}
