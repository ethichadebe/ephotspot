import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyUserToken } from './jwt';

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyUserToken(token);
      if (payload.type !== 'operator') return next(new Error('Operator token required'));
      socket.data.operatorId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const operatorId = socket.data.operatorId as string;
    socket.join(`operator:${operatorId}`);

    socket.on('disconnect', () => {
      socket.leave(`operator:${operatorId}`);
    });
  });

  return io;
}

export function getSocket(): SocketServer | null {
  return io;
}

export function emitToOperator(operatorId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`operator:${operatorId}`).emit(event, data);
}
