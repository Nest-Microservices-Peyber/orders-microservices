/* eslint-disable prettier/prettier */

import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';
import { PRODUCT_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger(OrdersService.name);


  // * Injectar la conexion con el micro servicio de productos
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
  ) {
    super()
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }


  async create(createOrderDto: CreateOrderDto) {

    try {
      //1 Confirmar los ids de los productos
      const productIds = createOrderDto.items.map((item) => item.productId);
      const products: any[] = await firstValueFrom(
        this.productClient.send({cmd: 'validate_products'}, productIds)
      );

      //2 calculos de los valores 
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId
        ).price;

        return  acc +(price * orderItem.quantity);
      }, 0)
  
      //return {totalAmout};
      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      //3 Crear una transaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(product => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          }
        }
      })

      return {
        ...order,
        OrderItem: order.OrderItem.map( (orderItem) => ({
          ...orderItem,
          name: products.find( product => product.id === orderItem.productId).name
        }))
      }
      //return order;
      //return {products, createOrderDto};
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Error creating order',
        error: error.message
      })
    }
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
    try {
      const order = await this.order.findFirst({
        where: { id },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          }
        }
       })
    
       if(!order){
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: `Order with id ${id} not found`,
          });
        }
  
        const productIds = order.OrderItem.map((orderItem) => orderItem.productId);
        const products: any[] = await firstValueFrom(
          this.productClient.send({cmd: 'validate_products'}, productIds)
        );
  
        return {
          ...order,
          OrderItem: order.OrderItem.map( (orderItem) => ({
            ...orderItem,
            name: products.find( product => product.id === orderItem.productId).name
          }))
        }
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Error creating order',
        error: error.message
      })
    }
      
     //return order;
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
