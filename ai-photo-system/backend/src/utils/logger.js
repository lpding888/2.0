const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 控制台输出格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      // 过滤掉一些不需要的字段
      const { stack, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        metaStr = `\n${JSON.stringify(cleanMeta, null, 2)}`;
      }
      if (stack) {
        metaStr += `\n${stack}`;
      }
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// 错误日志配置（按日期分割）
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  zippedArchive: true
});

// 完整日志配置（按日期分割）
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  zippedArchive: true
});

// 访问日志配置（HTTP请求）
const accessFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  zippedArchive: true
});

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    errorFileTransport,
    combinedFileTransport
  ],
  // 捕获未处理的异常和拒绝
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 创建访问日志记录器
const accessLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [accessFileTransport]
});

// 日志方法封装
const log = {
  // 信息日志
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  // 警告日志
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  // 错误日志
  error: (message, error = null, meta = {}) => {
    if (error instanceof Error) {
      logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        ...meta
      });
    } else {
      logger.error(message, { error, ...meta });
    }
  },

  // 调试日志
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },

  // HTTP访问日志
  access: (req, res, responseTime) => {
    accessLogger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.user_id || null
    });
  },

  // 数据库操作日志
  db: (operation, table, details = {}) => {
    logger.info('Database Operation', {
      operation,
      table,
      ...details
    });
  },

  // API调用日志
  api: (service, action, details = {}) => {
    logger.info('API Call', {
      service,
      action,
      ...details
    });
  },

  // 任务日志
  task: (taskId, status, details = {}) => {
    logger.info('Task Update', {
      taskId,
      status,
      ...details
    });
  },

  // 支付日志
  payment: (orderId, action, details = {}) => {
    logger.info('Payment', {
      orderId,
      action,
      ...details
    });
  },

  // 性能日志
  performance: (operation, duration, details = {}) => {
    const level = duration > 3000 ? 'warn' : 'info';
    logger[level]('Performance', {
      operation,
      duration: `${duration}ms`,
      ...details
    });
  }
};

// 日志文件清理（删除过期日志）
const cleanOldLogs = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
  const now = Date.now();

  try {
    const files = fs.readdirSync(logsDir);
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        logger.info('Deleted old log file', { file });
      }
    });
  } catch (error) {
    logger.error('Failed to clean old logs', error);
  }
};

// 每天清理一次过期日志
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

module.exports = log;
