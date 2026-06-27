import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';

// Global เพื่อให้ module อื่น (signup, reservations) inject ได้โดยไม่ต้อง import ซ้ำ
@Global()
@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
