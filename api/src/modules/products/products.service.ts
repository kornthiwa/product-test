import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import {
  GetListProductDto,
  GetProductListResponse,
} from './dto/get-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './entities/product.entity';
import { RedisService } from '../../shared/redis/redis.service';
import * as fs from 'fs/promises';

@Injectable()
export class ProductsService {
  private readonly listCacheVersionKey = 'products:list:version';

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly redisService: RedisService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const dup = await this.productModel
      .findOne({ id: createProductDto.id })
      .lean();
    if (dup) {
      throw new ConflictException(
        `Product with id ${createProductDto.id} already exists`,
      );
    }
    const doc = await this.productModel.create({
      ...createProductDto,
      is_active: createProductDto.is_active ?? true,
    });
    await this.redisService.incr(this.listCacheVersionKey);
    return doc.toObject();
  }

  async findAllList(dto: GetListProductDto): Promise<GetProductListResponse> {
    const { page = 1, pageSize = 10 } = dto;
    const skip = (page - 1) * pageSize;

    const version = await this.redisService.getInt(this.listCacheVersionKey, 1);
    const cacheKey = `products:list:v${version}:page=${page}:pageSize=${pageSize}`;
    const cached =
      await this.redisService.getJson<GetProductListResponse>(cacheKey);
    if (cached) return cached;

    const [total, items] = await Promise.all([
      this.productModel.countDocuments(),
      this.productModel
        .find()
        .skip(skip)
        .limit(pageSize)
        .sort({ id: 1 })
        .lean(),
    ]);

    const res: GetProductListResponse = { page, pageSize, total, data: items };
    await this.redisService.setJson(cacheKey, res, 30);
    return res;
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findOne({ id }).lean();
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productModel
      .findOneAndUpdate({ id }, updateProductDto, { new: true })
      .lean();
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    await this.redisService.incr(this.listCacheVersionKey);
    return product;
  }

  async remove(id: string): Promise<Product> {
    const product = await this.productModel
      .findOneAndUpdate({ id }, { is_active: false }, { new: true })
      .lean();
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    await this.redisService.incr(this.listCacheVersionKey);
    return product;
  }

  async syncJsonData(): Promise<void> {
    const jsonData = await fs.readFile('data/products.json', 'utf8');
    const rows: Array<Partial<Product> & { id: string }> = JSON.parse(jsonData);

    if (!Array.isArray(rows) || rows.length === 0) {
      await this.redisService.incr(this.listCacheVersionKey);
      return;
    }

    const ops = rows.map((raw) => {
      return {
        updateOne: {
          filter: { id: raw.id },
          update: {
            $set: {
              ...raw,
              is_active: raw.is_active ?? true,
            },
          },
          upsert: true,
        },
      } as const;
    });

    await this.productModel.bulkWrite(ops, { ordered: false });
    await this.redisService.incr(this.listCacheVersionKey);
  }
}
