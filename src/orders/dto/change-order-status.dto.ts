/* eslint-disable prettier/prettier */

import { OrderStatus } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";
import { OrderStatusList } from '../enum/order.enum';

export class ChangeOrderStatusDto {
    
    @IsUUID()
    id: string;

    @IsEnum(OrderStatusList, {
        message: `Status must be one of the following: ${OrderStatusList}`
    })
    status: OrderStatus
}