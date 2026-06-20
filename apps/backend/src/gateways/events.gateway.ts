import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export type EventPayload =
  | { event: 'DRAW_OPEN'; data: { drawId: string; name: string; closeAt: string } }
  | { event: 'DRAW_CLOSED'; data: { drawId: string } }
  | { event: 'RESULT_PUBLISHED'; data: { drawId: string; firstPrize: string; secondPrize?: string; thirdPrize?: string } }
  | { event: 'PRIZE_READY'; data: { drawId: string; count: number; totalAmount: string } }
  | { event: 'SALE_REGISTERED'; data: { branchId: string; amount: string } }
  | { event: 'LIMIT_ALERT'; data: { number: string; drawId: string; percentage: number } };

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL }, namespace: '/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const operatorId = client.handshake.query.operatorId as string;
    if (operatorId) client.join(`operator:${operatorId}`);
  }

  handleDisconnect(_client: Socket) {}

  emitToOperator(operatorId: string, payload: EventPayload) {
    this.server.to(`operator:${operatorId}`).emit(payload.event, payload.data);
  }

  emitToBranch(operatorId: string, branchId: string, payload: EventPayload) {
    this.server.to(`operator:${operatorId}`).emit(payload.event, {
      ...payload.data,
      branchId,
    });
  }
}
