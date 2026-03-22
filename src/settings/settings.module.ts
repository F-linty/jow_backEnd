import { Module } from '@nestjs/common';
import { SystemAdminGuard } from '@common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SystemAdminGuard],
})
export class SettingsModule {}

