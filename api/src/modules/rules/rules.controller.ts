import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { GetListRuleDto, GetRuleDtoResponse } from './dto/get-rule.dto';
import { RuleDocument } from './entities/rule.entity';

@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  async findAllList(@Query() dto: GetListRuleDto): Promise<GetRuleDtoResponse> {
    return this.rulesService.findAllList(dto);
  }

  @Post()
  async create(@Body() createRuleDto: CreateRuleDto): Promise<RuleDocument> {
    return await this.rulesService.create(createRuleDto);
  }

  @Get('/syncjson')
  async syncJson(): Promise<{ message: string }> {
    await this.rulesService.syncJsonData();
    return { message: 'Synced JSON data successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RuleDocument> {
    const rule = await this.rulesService.findOne(id);
    return rule;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateRuleDto,
  ): Promise<RuleDocument> {
    const rule = await this.rulesService.update(id, updateRuleDto);
    return rule;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<RuleDocument> {
    const rule = await this.rulesService.remove(id);
    return rule;
  }
}
