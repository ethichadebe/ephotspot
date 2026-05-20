import { emitToOperator, getSocket, initSocket } from '../src/lib/socket';
import { signUserToken, signSuperAdminToken } from '../src/lib/jwt';
import http from 'http';

describe('Socket.io real-time monitoring', () => {
  it('emitToOperator is a no-op when socket server not initialized', () => {
    // Should not throw even when io is null
    expect(() => emitToOperator('op-1', 'session:start', {})).not.toThrow();
  });

  it('getSocket returns null before initialization', () => {
    expect(getSocket()).toBeNull();
  });

  it('initSocket returns a SocketServer instance', () => {
    const server = http.createServer();
    const io = initSocket(server);
    expect(io).toBeDefined();
    expect(typeof io.to).toBe('function');
    io.close();
    server.close();
  });

  it('emitToOperator does not throw after init', () => {
    const server = http.createServer();
    initSocket(server);
    expect(() => emitToOperator('op-1', 'stats:update', { activeSessions: 5 })).not.toThrow();
    getSocket()?.close();
    server.close();
  });

  describe('JWT type enforcement', () => {
    it('operator token has correct type field', () => {
      const { verifyUserToken } = require('../src/lib/jwt');
      const token = signUserToken('op-1', 'operator');
      const payload = verifyUserToken(token);
      expect(payload.type).toBe('operator');
    });

    it('super admin token is rejected by verifyUserToken', () => {
      const { verifyUserToken } = require('../src/lib/jwt');
      const token = signSuperAdminToken('admin-1');
      expect(() => verifyUserToken(token)).toThrow();
    });
  });
});
