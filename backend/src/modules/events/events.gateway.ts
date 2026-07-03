import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    if (!token) {
      client.disconnect();
      return;
    }

    // Join organization room if orgSlug provided
    const orgSlug = client.handshake.query.orgSlug as string;
    if (orgSlug) {
      client.join(`org:${orgSlug}`);
    }
  }

  handleDisconnect(_client: Socket) {
    // cleanup if needed
  }

  emitJobCreated(data: { queueId: string; job: any }) {
    this.server.emit('job:created', data);
  }

  emitJobUpdated(data: { jobId: string; status: string; queueId: string }) {
    this.server.emit('job:updated', data);
  }

  emitQueueUpdated(data: { queueId: string; status: string }) {
    this.server.emit('queue:updated', data);
  }

  emitWorkerHeartbeat(data: { workerId: string; status: string }) {
    this.server.emit('worker:heartbeat', data);
  }
}
