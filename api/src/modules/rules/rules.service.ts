import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { Rule, RuleDocument } from './entities/rule.entity';
import { GetListRuleDto, GetRuleDtoResponse } from './dto/get-rule.dto';
import { RedisService } from '../../shared/redis/redis.service';
import * as fs from 'fs/promises';

@Injectable()
export class RulesService {
  private readonly listCacheVersionKey = 'rules:list:version';

  constructor(
    @InjectModel(Rule.name) private readonly ruleModel: Model<RuleDocument>,
    private readonly redisService: RedisService,
  ) {}

  async findWithQuery(query: QueryFilter<RuleDocument>): Promise<Rule[]> {
    return this.ruleModel.find(query).sort({ priority: -1 }).lean();
  }

  async findAllList(dto: GetListRuleDto): Promise<GetRuleDtoResponse> {
    const { page = 1, pageSize = 10 } = dto;
    const skip = (page - 1) * pageSize;

    const version = await this.redisService.getInt(this.listCacheVersionKey, 1);
    const cacheKey = `rules:list:v${version}:page=${page}:pageSize=${pageSize}`;
    const cached =
      await this.redisService.getJson<GetRuleDtoResponse>(cacheKey);
    if (cached) return cached;

    const [total, items] = await Promise.all([
      this.ruleModel.countDocuments(),
      this.ruleModel
        .find()
        .skip(skip)
        .limit(pageSize)
        .sort({ priority: -1, _id: -1 })
        .lean(),
    ]);

    const res: GetRuleDtoResponse = { page, pageSize, total, data: items };
    await this.redisService.setJson(cacheKey, res, 30);
    return res;
  }

  async create(createRuleDto: CreateRuleDto): Promise<RuleDocument> {
    const last = await this.ruleModel
      .findOne()
      .sort({ id: -1 })
      .select({ id: 1 })
      .lean();
    const nextId = typeof last?.id === 'number' ? last.id + 1 : 1;
    const rule = await this.ruleModel.create({
      ...createRuleDto,
      id: nextId,
    });
    await this.redisService.incr(this.listCacheVersionKey);
    return rule;
  }

  async findOne(id: string): Promise<RuleDocument> {
    const rule = await this.ruleModel.findOne({ id: parseInt(id) }).lean();
    if (!rule) {
      throw new NotFoundException(`Rule with id ${id} not found`);
    }
    return rule;
  }

  async update(
    id: string,
    updateRuleDto: UpdateRuleDto,
  ): Promise<RuleDocument> {
    const rule = await this.ruleModel
      .findOneAndUpdate({ id: parseInt(id) }, updateRuleDto, { new: true })
      .lean();
    if (!rule) {
      throw new NotFoundException(`Rule with id ${id} not found`);
    }
    await this.redisService.incr(this.listCacheVersionKey);
    return rule;
  }

  async remove(id: string): Promise<RuleDocument> {
    const rule = await this.ruleModel
      .findOneAndUpdate(
        { id: parseInt(id) },
        { is_active: false },
        { new: true },
      )
      .lean();
    if (!rule) {
      throw new NotFoundException(`Rule with id ${id} not found`);
    }
    await this.redisService.incr(this.listCacheVersionKey);
    return rule;
  }

  async syncJsonData(): Promise<void> {
    const jsonData = await fs.readFile('data/rules.json', 'utf8');
    const rules: Array<Partial<Rule> & { id: number }> = JSON.parse(jsonData);

    if (!Array.isArray(rules) || rules.length === 0) {
      await this.redisService.incr(this.listCacheVersionKey);
      return;
    }

    const ops = rules.map((raw) => {
      const effective_from = raw.effective_from
        ? new Date(raw.effective_from as unknown as string)
        : undefined;
      const effective_to = raw.effective_to
        ? new Date(raw.effective_to as unknown as string)
        : undefined;

      return {
        updateOne: {
          filter: { id: raw.id },
          update: {
            $set: {
              ...raw,
              effective_from,
              effective_to,
            },
          },
          upsert: true,
        },
      } as const;
    });

    await this.ruleModel.bulkWrite(ops, { ordered: false });
    await this.redisService.incr(this.listCacheVersionKey);
  }
}
