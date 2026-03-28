import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RulesModule } from './modules/rules/rules.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { RedisModule } from './shared/redis/redis.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/pricing_platform',
      }),
    }),
    RedisModule,
    RulesModule,
    QuotesModule,
    JobsModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
