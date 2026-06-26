import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// global เพื่อให้ menus/admin inject ได้โดยไม่ต้อง import ซ้ำ
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
