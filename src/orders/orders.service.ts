/* eslint-disable prettier/prettier */

import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger(OrdersService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }


  create(createOrderDto: CreateOrderDto) {
    //return createOrderDto;
    return this.order.create({
      data: createOrderDto
    })

    //return 'This action adds a new order'+ createOrderDto;
  }

  async findAll(orderfPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = orderfPaginationDto;
    //console.log('********************************',orderfPaginationDto)

    const totalItems = await this.order.count({
      where: { 
        status: status,
       }
    });

    const pageView = (page - 1) * limit
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: await this.order.findMany({
        skip: pageView,
        take: limit,
        where: { status: status, }
      }),
      meta: {
        totalItems,
        totalPages,
        page
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id }
     })
  
     if(!order){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Order with id ${id} not found`,
        });
      }
     return order;
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if(order.status === status){  
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Order is already ${status}`,
      });
    }

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    return await this.order.update({
      where: { id },
      data: { status }
    });
  }

}
