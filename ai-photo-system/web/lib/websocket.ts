// WebSocket连接管理
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket已连接');
      return;
    }

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

    this.socket = io(WS_URL, {
      path: '/ws',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectInterval,
    });

    // 连接成功
    this.socket.on('connect', () => {
      console.log('✅ WebSocket连接成功');
      this.reconnectAttempts = 0;

      // 发送认证
      this.socket?.emit('message', JSON.stringify({
        type: 'auth',
        token,
      }));
    });

    // 认证成功
    this.socket.on('auth_success', () => {
      console.log('✅ WebSocket认证成功');
      toast.success('实时连接已建立');
    });

    // 接收消息
    this.socket.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        this.emit(data.type, data);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    });

    // 任务进度
    this.socket.on('task_progress', (data: any) => {
      this.emit('task_progress', data);
    });

    // 任务完成
    this.socket.on('task_complete', (data: any) => {
      this.emit('task_complete', data);
      toast.success('任务已完成！');
    });

    // 任务失败
    this.socket.on('task_failed', (data: any) => {
      this.emit('task_failed', data);
      toast.error(`任务失败: ${data.error}`);
    });

    // 连接断开
    this.socket.on('disconnect', (reason: string) => {
      console.warn('⚠️ WebSocket断开连接:', reason);

      if (reason === 'io server disconnect') {
        // 服务器主动断开，尝试重连
        this.reconnect(token);
      }
    });

    // 连接错误
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ WebSocket连接错误:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('实时连接失败，部分功能可能受影响');
      }
    });

    // 心跳
    this.startHeartbeat();
  }

  // 重连
  private reconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ 达到最大重连次数');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 正在重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(token);
    }, this.reconnectInterval);
  }

  // 心跳
  private startHeartbeat() {
    setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('message', JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 每30秒发送一次心跳
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // 监听事件
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // 移除监听
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  // 触发事件
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // 发送消息
  send(type: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', JSON.stringify({ type, ...data }));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }
}

// 导出单例
export const wsManager = new WebSocketManager();

export default WebSocketManager;
