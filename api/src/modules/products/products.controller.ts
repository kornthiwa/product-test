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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  GetListProductDto,
  GetProductListResponse,
} from './dto/get-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<Product> {
    return await this.productsService.create(createProductDto);
  }

  @Get()
  async findAllList(
    @Query() dto: GetListProductDto,
  ): Promise<GetProductListResponse> {
    return await this.productsService.findAllList(dto);
  }

  @Get('syncjson')
  async syncJson(): Promise<{ message: string }> {
    await this.productsService.syncJsonData();
    return { message: 'Synced JSON data successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Product> {
    const product = await this.productsService.findOne(id);
    return product;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productsService.update(id, updateProductDto);
    return product;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Product> {
    const product = await this.productsService.remove(id);
    return product;
  }
}
