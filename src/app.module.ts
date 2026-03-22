import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule, PrismaModule } from './common';
import { HomeModule } from './home/home.module';
import { OrgsModule } from './orgs/orgs.module';
import { ProductTypesModule } from './product-types/product-types.module';
import { MaterialCategoriesModule } from './material-categories/material-categories.module';
import { GraphModule } from './graph/graph.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    HomeModule,
    OrgsModule,
    ProductTypesModule,
    MaterialCategoriesModule,
    GraphModule,
    PurchasesModule,
    SettingsModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
