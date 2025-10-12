const express = require('express');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// 加载环境变量
dotenv.config();

// 导入日志和监控
const logger = require('./utils/logger');
const sentry = require('./utils/sentry');
const { performanceMonitor, requestCounter, getHealthMetrics } = require('./middleware/performanceMonitor');

// 导入配置
const { testConnection: testDbConnection } = require('./config/database');
const { testConnection: testRedisConnection } = require('./config/redis');
const { initWebSocketServer } = require('./services/websocket');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { ensureUploadDir } = require('./utils/upload');

// 导入路由
const authRoutes = require('./routes/authRoutes');
const worksRoutes = require('./routes/worksRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const scenesRoutes = require('./routes/scenesRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const creditsRoutes = require('./routes/creditsRoutes');
const adminRoutes = require('./routes/adminRoutes');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 端口配置
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 初始化Sentry（必须在所有中间件之前）
sentry.initSentry(app);

// Sentry请求处理器（必须是第一个中间件）
app.use(sentry.requestHandler());
app.use(sentry.tracingHandler());

// 基础中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // 安全头
app.use(cors()); // 跨域
app.use(compression()); // Gzip压缩
app.use(express.json({ limit: '50mb' })); // JSON解析
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // URL编码解析

// 性能监控和请求计数
app.use(performanceMonitor);
app.use(requestCounter);

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 最多1000个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查（增强版）
app.get('/health', (req, res) => {
  try {
    const metrics = getHealthMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/admin', adminRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Photo System API Server',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/works',
      '/api/tasks',
      '/api/scenes',
      '/api/upload',
      '/api/credits',
      '/api/admin',
      '/health',
      '/ws'
    ]
  });
});

// n8n回调接口（供n8n调用，更新任务状态）
app.post('/api/callback/task-complete', express.json(), async (req, res) => {
  try {
    const { task_id, images, ai_description } = req.body;

    if (!task_id) {
      return res.status(400).json({
        success: false,
        message: '缺少task_id参数'
      });
    }

    const { query } = require('./config/database');
    const { sendTaskComplete } = require('./services/websocket');

    // 更新works表
    await query(
      `UPDATE works SET
        status = 'completed',
        images = ?,
        ai_description = ?,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE task_id = ?`,
      [JSON.stringify(images || []), ai_description || '', task_id]
    );

    // 更新task_queue表
    await query(
      `UPDATE task_queue SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE task_id = ?`,
      [task_id]
    );

    // 获取用户ID并发送WebSocket通知
    const tasks = await query(
      'SELECT user_id FROM task_queue WHERE task_id = ?',
      [task_id]
    );

    if (tasks.length > 0) {
      sendTaskComplete(tasks[0].user_id, task_id, { images, ai_description });
    }

    console.log(`✅ 任务完成回调处理成功: ${task_id}`);

    res.json({
      success: true,
      message: '任务状态已更新'
    });

  } catch (error) {
    console.error('❌ 任务完成回调处理失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// n8n任务失败回调
app.post('/api/callback/task-failed', express.json(), async (req, res) => {
  try {
    const { task_id, error } = req.body;

    if (!task_id) {
      return res.status(400).json({
        success: false,
        message: '缺少task_id参数'
      });
    }

    const { query } = require('./config/database');
    const { sendTaskFailed } = require('./services/websocket');

    // 更新works表
    await query(
      `UPDATE works SET
        status = 'failed',
        error = ?,
        updated_at = NOW()
      WHERE task_id = ?`,
      [error || '未知错误', task_id]
    );

    // 更新task_queue表
    await query(
      `UPDATE task_queue SET
        status = 'failed',
        error = ?,
        updated_at = NOW()
      WHERE task_id = ?`,
      [error || '未知错误', task_id]
    );

    // 获取用户ID并发送WebSocket通知
    const tasks = await query(
      'SELECT user_id FROM task_queue WHERE task_id = ?',
      [task_id]
    );

    if (tasks.length > 0) {
      sendTaskFailed(tasks[0].user_id, task_id, error || '未知错误');
    }

    console.log(`⚠️ 任务失败回调处理成功: ${task_id}`);

    res.json({
      success: true,
      message: '任务状态已更新'
    });

  } catch (error) {
    console.error('❌ 任务失败回调处理失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 404处理
app.use(notFoundHandler);

// Sentry错误处理器（必须在其他错误处理器之前）
app.use(sentry.errorHandler());

// 错误处理
app.use(errorHandler);

// 初始化服务
async function initializeServices() {
  logger.info('🚀 正在初始化服务...');

  // 确保上传目录存在
  await ensureUploadDir();
  logger.info('✅ 上传目录已准备');

  // 测试数据库连接
  const dbConnected = await testDbConnection();
  if (!dbConnected) {
    logger.error('❌ 数据库连接失败，服务无法启动');
    process.exit(1);
  }

  // 测试Redis连接
  const redisConnected = await testRedisConnection();
  if (!redisConnected) {
    logger.warn('⚠️ Redis连接失败，部分功能可能受影响');
  }

  // 初始化WebSocket服务器
  initWebSocketServer(server);
  logger.info('✅ WebSocket服务器初始化完成');

  // 启动队列Worker（在单独的文件中）
  require('./workers/taskWorker');
  logger.info('✅ 任务队列Worker启动完成');

  logger.info('✅ 所有服务初始化完成');
}

// 启动服务器
async function startServer() {
  try {
    await initializeServices();

    server.listen(PORT, () => {
      logger.info('');
      logger.info('='.repeat(50));
      logger.info('🎉 AI Photo System 后端服务已启动');
      logger.info('='.repeat(50));
      logger.info(`📡 HTTP服务器: http://localhost:${PORT}`);
      logger.info(`🔌 WebSocket服务: ws://localhost:${PORT}/ws`);
      logger.info(`🌍 环境: ${NODE_ENV}`);
      logger.info(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
      logger.info('='.repeat(50));
      logger.info('');
    });

  } catch (error) {
    logger.error('❌ 服务器启动失败', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.warn('⚠️ 收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    logger.info('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.warn('⚠️ 收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    logger.info('✅ 服务器已关闭');
    process.exit(0);
  });
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('❌ 未捕获的异常', error);
  sentry.captureException(error, { tags: { type: 'uncaughtException' } });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ 未处理的Promise拒绝', reason instanceof Error ? reason : new Error(String(reason)));
  sentry.captureException(reason, { tags: { type: 'unhandledRejection' } });
});

// 启动服务器
startServer();

module.exports = app;
