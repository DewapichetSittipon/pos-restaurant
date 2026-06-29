import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { MenusModule } from './menus/menus.module';
import { CategoriesModule } from './categories/categories.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { SignupModule } from './signup/signup.module';
import { StaffModule } from './staff/staff.module';
import { ShopModule } from './shop/shop.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { MembersModule } from './members/members.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './uploads/storage.module';
import { NotificationModule } from './notifications/notification.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // กัน brute-force: ใช้ ThrottlerGuard เฉพาะ endpoint login/signup (ไม่ global)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    EventsModule,
    TablesModule,
    OrdersModule,
    ServiceRequestsModule,
    MenusModule,
    CategoriesModule,
    ReportsModule,
    AdminModule,
    SignupModule,
    StaffModule,
    ShopModule,
    ShiftsModule,
    ReservationsModule,
    MembersModule,
    PromotionsModule,
    AuditModule,
    StorageModule,
    NotificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
