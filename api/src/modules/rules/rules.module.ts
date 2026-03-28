import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { Rule, RuleSchema } from './entities/rule.entity';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rule.name, schema: RuleSchema }]),
    RedisModule,
  ],
  controllers: [RulesController],
  providers: [RulesService],
})
export class RulesModule {}
