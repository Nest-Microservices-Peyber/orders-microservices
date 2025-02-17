/* eslint-disable prettier/prettier */

import { IsEnum, IsOptional } from "class-validator";
import {  OrderStatusList } from "../enum/order.enum";
import { PaginationDto } from "src/common";
import { OrderStatus } from "@prisma/client";

export class OrderPaginationDto extends PaginationDto {
    @IsEnum(OrderStatusList, {
        message: `Status must be one of the following: ${OrderStatusList}`
    })
    @IsOptional()
    status: OrderStatus;
    
}