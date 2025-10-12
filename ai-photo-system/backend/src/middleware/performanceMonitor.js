const logger = require('../utils/logger');
const os = require('os');

// 慢请求阈值（毫秒）
const SLOW_REQUEST_THRESHOLD = 3000;

// 性能监控中间件
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // 记录请求开始
  logger.debug('Request started', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    // 计算内存增长
    const memoryDelta = {
      heapUsed: ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2),
      rss: ((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2)
    };

    // 记录访问日志
    logger.access(req, res, duration);

    // 慢请求警告
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow Request Detected', {
        method: req.method,
        url: req.originalUrl || req.url,
        duration: `${duration}ms`,
        status: res.statusCode,
        memoryDelta: memoryDelta,
        userId: req.user?.user_id || null
      });
    }

    // 错误响应记录
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]('Error Response', {
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.user_id || null
      });
    }

    // 性能日志（仅在调试模式下记录所有请求）
    if (process.env.LOG_LEVEL === 'debug') {
      logger.performance(
        `${req.method} ${req.originalUrl || req.url}`,
        duration,
        {
          status: res.statusCode,
          memoryDelta: memoryDelta,
          contentLength: res.get('content-length') || 0
        }
      );
    }
  });

  next();
};

// 系统资源监控
class SystemMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        slow: 0
      }
    };

    this.monitoringInterval = null;

    // 每分钟收集一次系统指标
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      return; // 已经在监控中
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // 每分钟

    // Node.js进程退出时清理定时器
    process.on('exit', () => this.stopMonitoring());
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('系统监控已停止');
    }
  }

  collectMetrics() {
    // CPU使用率
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = ((1 - totalIdle / totalTick) * 100).toFixed(2);

    // 内存使用
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

    // Node.js进程内存
    const processMemory = process.memoryUsage();

    this.metrics.cpu.push(parseFloat(cpuUsage));
    this.metrics.memory.push(parseFloat(memoryUsage));

    // 只保留最近60条记录（1小时）
    if (this.metrics.cpu.length > 60) {
      this.metrics.cpu.shift();
      this.metrics.memory.shift();
    }

    // 记录系统指标
    logger.info('System Metrics', {
      cpu: {
        usage: `${cpuUsage}%`,
        cores: cpus.length
      },
      memory: {
        total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB`,
        used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)}GB`,
        free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)}GB`,
        usage: `${memoryUsage}%`
      },
      process: {
        heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(processMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(processMemory.rss / 1024 / 1024).toFixed(2)}MB`,
        external: `${(processMemory.external / 1024 / 1024).toFixed(2)}MB`
      },
      uptime: {
        system: `${(os.uptime() / 3600).toFixed(2)}h`,
        process: `${(process.uptime() / 3600).toFixed(2)}h`
      },
      requests: this.metrics.requests
    });

    // CPU或内存使用率过高警告
    if (cpuUsage > 80) {
      logger.warn('High CPU Usage', { usage: `${cpuUsage}%` });
    }

    if (memoryUsage > 85) {
      logger.warn('High Memory Usage', { usage: `${memoryUsage}%` });
    }

    // 进程内存泄漏检测
    if (processMemory.heapUsed / 1024 / 1024 > 500) {
      logger.warn('Potential Memory Leak', {
        heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }

  getMetrics() {
    return {
      cpu: {
        current: this.metrics.cpu[this.metrics.cpu.length - 1] || 0,
        average: this.metrics.cpu.reduce((a, b) => a + b, 0) / this.metrics.cpu.length || 0,
        max: Math.max(...this.metrics.cpu) || 0,
        history: this.metrics.cpu
      },
      memory: {
        current: this.metrics.memory[this.metrics.memory.length - 1] || 0,
        average: this.metrics.memory.reduce((a, b) => a + b, 0) / this.metrics.memory.length || 0,
        max: Math.max(...this.metrics.memory) || 0,
        history: this.metrics.memory
      },
      requests: this.metrics.requests
    };
  }

  recordRequest(statusCode, duration) {
    this.metrics.requests.total++;

    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    if (duration > SLOW_REQUEST_THRESHOLD) {
      this.metrics.requests.slow++;
    }
  }

  reset() {
    this.metrics.requests = {
      total: 0,
      success: 0,
      errors: 0,
      slow: 0
    };
  }
}

// 创建系统监控实例
const systemMonitor = new SystemMonitor();

// 请求计数中间件
const requestCounter = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    systemMonitor.recordRequest(res.statusCode, duration);
  });

  next();
};

// 健康检查端点增强
const getHealthMetrics = () => {
  const metrics = systemMonitor.getMetrics();

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      loadAverage: os.loadavg()
    },
    performance: {
      cpu: {
        current: `${metrics.cpu.current}%`,
        average: `${metrics.cpu.average.toFixed(2)}%`,
        max: `${metrics.cpu.max}%`
      },
      memory: {
        current: `${metrics.memory.current}%`,
        average: `${metrics.memory.average.toFixed(2)}%`,
        max: `${metrics.memory.max}%`,
        process: {
          heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)}MB`,
          rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`
        }
      },
      requests: {
        total: metrics.requests.total,
        success: metrics.requests.success,
        errors: metrics.requests.errors,
        slow: metrics.requests.slow,
        successRate: metrics.requests.total > 0
          ? `${((metrics.requests.success / metrics.requests.total) * 100).toFixed(2)}%`
          : '0%'
      }
    }
  };
};

module.exports = {
  performanceMonitor,
  requestCounter,
  systemMonitor,
  getHealthMetrics
};
