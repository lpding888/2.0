const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// 存储所有活跃的WebSocket连接
const clients = new Map(); // user_id -> Set of WebSocket connections

// 初始化WebSocket服务器
function initWebSocketServer(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/ws'
  });

  wss.on('connection', async (ws, req) => {
    console.log('🔌 WebSocket客户端连接');

    let userId = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // 处理认证
        if (data.type === 'auth') {
          const token = data.token;

          if (!token) {
            ws.send(JSON.stringify({
              type: 'error',
              message: '缺少认证令牌'
            }));
            ws.close();
            return;
          }

          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;

            // 验证用户是否存在
            const users = await query(
              'SELECT user_id FROM users WHERE user_id = ? AND status = ?',
              [userId, 'active']
            );

            if (users.length === 0) {
              ws.send(JSON.stringify({
                type: 'error',
                message: '用户不存在'
              }));
              ws.close();
              return;
            }

            // 将连接添加到客户端映射
            if (!clients.has(userId)) {
              clients.set(userId, new Set());
            }
            clients.get(userId).add(ws);

            console.log(`✅ 用户 ${userId} 认证成功，当前连接数: ${clients.get(userId).size}`);

            // 发送认证成功消息
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: '认证成功'
            }));

          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: '认证失败'
            }));
            ws.close();
          }
        }

        // 处理心跳
        else if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('❌ 处理WebSocket消息失败:', error);
      }
    });

    ws.on('close', () => {
      // 从客户端映射中移除连接
      if (userId && clients.has(userId)) {
        clients.get(userId).delete(ws);
        if (clients.get(userId).size === 0) {
          clients.delete(userId);
        }
        console.log(`🔌 用户 ${userId} 断开连接，剩余连接数: ${clients.get(userId)?.size || 0}`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket错误:', error);
    });
  });

  console.log('✅ WebSocket服务器已启动');

  return wss;
}

// 向特定用户发送消息
function sendToUser(userId, message) {
  if (!clients.has(userId)) {
    console.log(`⚠️ 用户 ${userId} 没有活跃的WebSocket连接`);
    return false;
  }

  const userClients = clients.get(userId);
  let sentCount = 0;

  userClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      sentCount++;
    }
  });

  console.log(`📤 向用户 ${userId} 发送消息，成功: ${sentCount}/${userClients.size}`);

  return sentCount > 0;
}

// 广播消息给所有用户
function broadcast(message) {
  let sentCount = 0;

  clients.forEach((userClients, userId) => {
    userClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });
  });

  console.log(`📢 广播消息给 ${sentCount} 个客户端`);

  return sentCount;
}

// 发送任务进度更新
function sendTaskProgress(userId, taskId, progress, message = '') {
  return sendToUser(userId, {
    type: 'task_progress',
    task_id: taskId,
    progress: progress,
    message: message,
    timestamp: Date.now()
  });
}

// 发送任务完成通知
function sendTaskComplete(userId, taskId, result) {
  return sendToUser(userId, {
    type: 'task_complete',
    task_id: taskId,
    result: result,
    timestamp: Date.now()
  });
}

// 发送任务失败通知
function sendTaskFailed(userId, taskId, error) {
  return sendToUser(userId, {
    type: 'task_failed',
    task_id: taskId,
    error: error,
    timestamp: Date.now()
  });
}

// 获取在线用户数量
function getOnlineUsersCount() {
  return clients.size;
}

// 获取总连接数
function getTotalConnectionsCount() {
  let total = 0;
  clients.forEach(userClients => {
    total += userClients.size;
  });
  return total;
}

module.exports = {
  initWebSocketServer,
  sendToUser,
  broadcast,
  sendTaskProgress,
  sendTaskComplete,
  sendTaskFailed,
  getOnlineUsersCount,
  getTotalConnectionsCount
};
